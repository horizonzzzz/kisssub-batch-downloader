import { BATCH_EVENT } from "./lib/constants"
import {
  classifyPreparedBatchItem,
  classifyExtractionResult,
  createStats,
  normalizeBatchItems
} from "./lib/batch"
import { extractSingleItem } from "./lib/extraction"
import { addTorrentFilesToQb, addUrlsToQb, loginQb, qbFetchText } from "./lib/qb"
import {
  ensureSettings,
  getSettings,
  sanitizeSettings,
  saveSettings
} from "./lib/settings"
import type {
  BatchEventPayload,
  BatchItem,
  BatchStats,
  ClassifiedBatchResult,
  Settings
} from "./lib/types"

type RuntimeRequest =
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings?: Partial<Settings> }
  | { type: "TEST_QB_CONNECTION"; settings?: Partial<Settings> | null }
  | { type: "OPEN_OPTIONS_PAGE" }
  | { type: "START_BATCH_DOWNLOAD"; items?: BatchItem[]; savePath?: string }

type BatchJob = {
  sourceTabId: number
  stats: BatchStats
  results: ClassifiedBatchResult[]
  settings: Settings
  savePath: string
}

const activeJobs = new Map<number, BatchJob>()

chrome.runtime.onInstalled.addListener(() => {
  void ensureSettings()
})

chrome.runtime.onMessage.addListener((message: RuntimeRequest, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return false
  }

  void (async () => {
    try {
      switch (message.type) {
        case "GET_SETTINGS":
          sendResponse({ ok: true, settings: await getSettings() })
          return
        case "SAVE_SETTINGS":
          sendResponse({
            ok: true,
            settings: await saveSettings(message.settings ?? {})
          })
          return
        case "TEST_QB_CONNECTION":
          sendResponse({
            ok: true,
            result: await testQbConnection(message.settings ?? null)
          })
          return
        case "OPEN_OPTIONS_PAGE":
          await chrome.runtime.openOptionsPage()
          sendResponse({ ok: true })
          return
        case "START_BATCH_DOWNLOAD":
          sendResponse(await startBatchDownload(sender, message.items ?? [], message.savePath))
          return
        default:
          sendResponse({
            ok: false,
            error: `Unsupported message type: ${String((message as { type: string }).type)}`
          })
      }
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  })()

  return true
})

async function testQbConnection(overrideSettings: Partial<Settings> | null) {
  const settings = sanitizeSettings({
    ...(await getSettings()),
    ...(overrideSettings ?? {})
  })

  await loginQb(settings)
  const version = await qbFetchText(settings, "/api/v2/app/version", { method: "GET" })

  return {
    baseUrl: settings.qbBaseUrl,
    version: version.trim() || "unknown"
  }
}

async function startBatchDownload(
  sender: chrome.runtime.MessageSender,
  items: BatchItem[],
  requestedSavePath?: string
) {
  const sourceTabId = typeof sender.tab?.id === "number" ? sender.tab.id : null
  if (sourceTabId === null) {
    throw new Error("Batch downloads can only be started from a supported source tab.")
  }

  if (activeJobs.has(sourceTabId)) {
    throw new Error("A batch download is already running in this tab.")
  }

  const normalizedItems = normalizeBatchItems(items)
  if (!normalizedItems.length) {
    throw new Error("No valid source detail pages were selected.")
  }

  const savePath = normalizeSavePath(requestedSavePath)
  const settings = await saveSettings({ lastSavePath: savePath })
  const job: BatchJob = {
    sourceTabId,
    stats: createStats(normalizedItems.length),
    results: [],
    settings: {
      ...settings,
      lastSavePath: savePath
    },
    savePath
  }

  activeJobs.set(sourceTabId, job)

  void runBatch(job, normalizedItems).catch(async (error: unknown) => {
    const failure = error instanceof Error ? error.message : String(error)
    await sendBatchEvent(sourceTabId, {
      stage: "fatal",
      stats: job.stats,
      error: failure
    })
    activeJobs.delete(sourceTabId)
  })

  return {
    ok: true,
    total: normalizedItems.length
  }
}

async function runBatch(job: BatchJob, items: BatchItem[]) {
  await sendBatchEvent(job.sourceTabId, {
    stage: "started",
    stats: job.stats,
    message: job.savePath
      ? `Preparing ${items.length} selected posts. Requested save path: ${job.savePath}`
      : `Preparing ${items.length} selected posts. Using the downloader default save path.`
  })

  const pending = items.slice()
  const preparedSubmissions: ClassifiedBatchResult[] = []
  const seenHashes = new Set<string>()
  const seenUrls = new Set<string>()
  const workerCount = Math.min(job.settings.concurrency, pending.length)

  const workers = Array.from({ length: workerCount }, () =>
    processQueue(job, pending, preparedSubmissions, seenHashes, seenUrls)
  )

  await Promise.all(workers)

  if (!preparedSubmissions.length) {
    await finalizeBatch(job, null)
    return
  }

  await sendBatchEvent(job.sourceTabId, {
    stage: "submitting",
    stats: job.stats,
    message: job.savePath
      ? `Submitting ${preparedSubmissions.length} unique item(s) to qBittorrent with save path ${job.savePath}.`
      : `Submitting ${preparedSubmissions.length} unique link(s) to the downloader using the default save path.`
  })

  try {
    await loginQb(job.settings)
    await submitPreparedResults(job, preparedSubmissions)
  } catch (error: unknown) {
    const failure = error instanceof Error ? error.message : String(error)
    for (const entry of preparedSubmissions) {
      entry.status = "failed"
      entry.message = `qBittorrent submission failed: ${failure}`
      job.stats.failed += 1
    }
  }

  await finalizeBatch(job, null)
}

async function processQueue(
  job: BatchJob,
  pending: BatchItem[],
  preparedSubmissions: ClassifiedBatchResult[],
  seenHashes: Set<string>,
  seenUrls: Set<string>
) {
  while (pending.length) {
    const item = pending.shift()
    if (!item) {
      return
    }

    const classified =
      classifyPreparedBatchItem(item, job.settings, seenHashes, seenUrls) ??
      classifyExtractionResult(
        item.sourceId,
        await extractSingleItem(item, job.settings),
        job.settings,
        seenHashes,
        seenUrls
      )

    job.results.push(classified)
    job.stats.processed += 1

    if (classified.status === "ready") {
      preparedSubmissions.push(classified)
      job.stats.prepared += 1
    } else if (classified.status === "duplicate") {
      job.stats.duplicated += 1
    } else {
      job.stats.failed += 1
    }

    await sendBatchEvent(job.sourceTabId, {
      stage: "progress",
      stats: job.stats,
      item: {
        title: classified.title,
        detailUrl: classified.detailUrl,
        status: classified.status,
        message: classified.message
      }
    })
  }
}

async function finalizeBatch(job: BatchJob, errorMessage: string | null) {
  const summary = {
    submitted: job.results.filter((entry) => entry.status === "submitted").length,
    duplicated: job.results.filter((entry) => entry.status === "duplicate").length,
    failed: job.results.filter((entry) => entry.status === "failed").length
  }

  await sendBatchEvent(job.sourceTabId, {
    stage: errorMessage ? "error" : "completed",
    stats: job.stats,
    error: errorMessage ?? undefined,
    summary,
    results: job.results.map((entry) => ({
      title: entry.title,
      detailUrl: entry.detailUrl,
      status: entry.status,
      message: entry.message
    }))
  })

  activeJobs.delete(job.sourceTabId)
}

async function sendBatchEvent(tabId: number, payload: BatchEventPayload) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: BATCH_EVENT,
      ...payload
    })
  } catch {
    // Ignore tabs that navigated away or were closed.
  }
}

function normalizeSavePath(path: unknown) {
  return String(path ?? "").trim()
}

async function submitPreparedResults(job: BatchJob, preparedSubmissions: ClassifiedBatchResult[]) {
  const urlSubmissions = preparedSubmissions.filter(
    (entry) => entry.deliveryMode === "magnet" || entry.deliveryMode === "torrent-url"
  )

  if (urlSubmissions.length) {
    try {
      await addUrlsToQb(
        job.settings,
        urlSubmissions.map((entry) => entry.submitUrl),
        job.savePath
          ? {
              savePath: job.savePath
            }
          : undefined
      )

      for (const entry of urlSubmissions) {
        entry.status = "submitted"
        entry.message =
          entry.deliveryMode === "magnet"
            ? "Magnet queued in qBittorrent."
            : "Torrent URL queued in qBittorrent."
        job.stats.submitted += 1
      }
    } catch (error: unknown) {
      const failure = error instanceof Error ? error.message : String(error)
      for (const entry of urlSubmissions) {
        entry.status = "failed"
        entry.message = `qBittorrent submission failed: ${failure}`
        job.stats.failed += 1
      }
    }
  }

  for (const entry of preparedSubmissions) {
    if (entry.deliveryMode !== "torrent-file") {
      continue
    }

    try {
      const torrent = await fetchTorrentForUpload(entry.submitUrl)
      await addTorrentFilesToQb(
        job.settings,
        [torrent],
        job.savePath
          ? {
              savePath: job.savePath
            }
          : undefined
      )

      entry.status = "submitted"
      entry.message = "Torrent file uploaded to qBittorrent."
      job.stats.submitted += 1
    } catch (error: unknown) {
      const failure = error instanceof Error ? error.message : String(error)
      entry.status = "failed"
      entry.message = `qBittorrent submission failed: ${failure}`
      job.stats.failed += 1
    }
  }
}

async function fetchTorrentForUpload(torrentUrl: string) {
  const response = await fetch(torrentUrl, {
    credentials: "include"
  })

  if (!response.ok) {
    throw new Error(`Torrent download failed with HTTP ${response.status}.`)
  }

  const blob = await response.blob()
  return {
    filename: getTorrentFilename(torrentUrl, response.headers.get("content-disposition")),
    blob
  }
}

function getTorrentFilename(torrentUrl: string, contentDisposition: string | null) {
  const fromHeader = String(contentDisposition ?? "").match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)
  if (fromHeader?.[1]) {
    return decodeURIComponent(fromHeader[1].replace(/"/g, "")).trim()
  }

  try {
    const pathname = new URL(torrentUrl).pathname
    const filename = pathname.split("/").pop() || ""
    if (filename) {
      return filename
    }
  } catch {
    // Fall back to the generic filename below.
  }

  return "download.torrent"
}

export {}
