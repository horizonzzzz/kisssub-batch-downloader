import {
  classifyPreparedBatchItem,
  classifyExtractionResult,
  createStats,
  normalizeBatchItems
} from "./batch"
import { getDisabledSources } from "./source-enablement"
import type { QbTorrentFile } from "./qb"
import type {
  BatchEventPayload,
  BatchItem,
  BatchStats,
  ClassifiedBatchResult,
  ExtractionResult,
  Settings
} from "./types"

export type BatchJob = {
  sourceTabId: number
  stats: BatchStats
  results: ClassifiedBatchResult[]
  settings: Settings
  savePath: string
}

type BackgroundBatchDependencies = {
  saveSettings: (partialSettings: Partial<Settings>) => Promise<Settings>
  extractSingleItem: (item: BatchItem, settings: Settings) => Promise<ExtractionResult>
  sendBatchEvent: (tabId: number, payload: BatchEventPayload) => Promise<void>
  loginQb: (settings: Settings) => Promise<void>
  addUrlsToQb: (
    settings: Settings,
    urls: string[],
    options?: {
      savePath?: string
    }
  ) => Promise<void>
  addTorrentFilesToQb: (
    settings: Settings,
    torrents: QbTorrentFile[],
    options?: {
      savePath?: string
    }
  ) => Promise<void>
  fetchImpl?: typeof fetch
}

export function createBatchDownloadManager(dependencies: BackgroundBatchDependencies) {
  const activeJobs = new Map<number, BatchJob>()

  async function startBatchDownload(
    sourceTabId: number | null,
    items: BatchItem[],
    requestedSavePath?: string
  ) {
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
    const settings = await dependencies.saveSettings({ lastSavePath: savePath })
    const disabledSources = getDisabledSources(
      Array.from(new Set(normalizedItems.map((item) => item.sourceId))),
      settings
    )
    if (disabledSources.length) {
      throw new Error(`Batch downloads are disabled for source: ${disabledSources.join(", ")}`)
    }

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
      await dependencies.sendBatchEvent(sourceTabId, {
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
    await dependencies.sendBatchEvent(job.sourceTabId, {
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

    await dependencies.sendBatchEvent(job.sourceTabId, {
      stage: "submitting",
      stats: job.stats,
      message: job.savePath
        ? `Submitting ${preparedSubmissions.length} unique item(s) to qBittorrent with save path ${job.savePath}.`
        : `Submitting ${preparedSubmissions.length} unique link(s) to the downloader using the default save path.`
    })

    try {
      await dependencies.loginQb(job.settings)
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
          await dependencies.extractSingleItem(item, job.settings),
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

      await dependencies.sendBatchEvent(job.sourceTabId, {
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

    await dependencies.sendBatchEvent(job.sourceTabId, {
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

  async function submitPreparedResults(job: BatchJob, preparedSubmissions: ClassifiedBatchResult[]) {
    const urlSubmissions = preparedSubmissions.filter(
      (entry) => entry.deliveryMode === "magnet" || entry.deliveryMode === "torrent-url"
    )

    if (urlSubmissions.length) {
      try {
        await dependencies.addUrlsToQb(
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
        const torrent = await fetchTorrentForUpload(entry.submitUrl, dependencies.fetchImpl)
        await dependencies.addTorrentFilesToQb(
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

  return {
    activeJobs,
    startBatchDownload
  }
}

export async function fetchTorrentForUpload(
  torrentUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<QbTorrentFile> {
  const response = await fetchImpl(torrentUrl, {
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

export function getTorrentFilename(torrentUrl: string, contentDisposition: string | null) {
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

function normalizeSavePath(path: unknown) {
  return String(path ?? "").trim()
}
