import { getDisabledSources, normalizeSavePath } from "../settings"
import {
  createHistoryItemId,
  createHistoryRecordId,
  saveTaskHistory
} from "../history/storage"
import { HISTORY_RECORD_VERSION, type TaskHistoryRecord } from "../history/types"
import type { StartBatchDownloadSuccessResponse } from "../shared/messages"
import type { BatchItem, ClassifiedBatchResult, SourceId } from "../shared/types"
import { SITE_CONFIG_META } from "../sources/site-meta"
import { createBatchJob, recordBatchResult, summarizeBatchResults } from "./job-state"
import { getBatchStartedMessage, getBatchSubmittingMessage } from "./messages"
import { classifyExtractionResult, classifyPreparedBatchItem, normalizeBatchItems } from "./preparation"
import { fetchTorrentForUpload } from "./torrent-file"
import type { BackgroundBatchDependencies, BatchJob } from "./types"

export function createBatchDownloadManager(dependencies: BackgroundBatchDependencies) {
  const activeJobs = new Map<number, BatchJob>()

  async function startBatchDownload(
    sourceTabId: number | null,
    items: BatchItem[],
    requestedSavePath?: string
  ): Promise<StartBatchDownloadSuccessResponse> {
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

    const job = createBatchJob(sourceTabId, normalizedItems.length, settings, savePath)
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

  async function runBatch(job: BatchJob, items: BatchItem[]): Promise<void> {
    await dependencies.sendBatchEvent(job.sourceTabId, {
      stage: "started",
      stats: job.stats,
      message: getBatchStartedMessage(items.length, job.savePath)
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
      message: getBatchSubmittingMessage(preparedSubmissions.length, job.savePath)
    })

    try {
      await dependencies.loginQb(job.settings)
      await submitPreparedResults(job, preparedSubmissions)
    } catch (error: unknown) {
      const failure = error instanceof Error ? error.message : String(error)
      markFailedSubmissions(preparedSubmissions, job, failure)
    }

    await finalizeBatch(job, null)
    const sourceId = items[0]?.sourceId ?? "kisssub"
    saveTaskHistory(buildHistoryRecord(job, sourceId)).catch((err) =>
      console.warn("Failed to save task history:", err)
    )
  }

  async function processQueue(
    job: BatchJob,
    pending: BatchItem[],
    preparedSubmissions: ClassifiedBatchResult[],
    seenHashes: Set<string>,
    seenUrls: Set<string>
  ): Promise<void> {
    while (pending.length) {
      const item = pending.shift()
      if (!item) {
        return
      }

      const classified = await prepareBatchItem(job, item, seenHashes, seenUrls)
      recordBatchResult(job, classified)

      if (classified.status === "ready") {
        preparedSubmissions.push(classified)
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

  async function finalizeBatch(job: BatchJob, errorMessage: string | null): Promise<void> {
    await dependencies.sendBatchEvent(job.sourceTabId, {
      stage: errorMessage ? "error" : "completed",
      stats: job.stats,
      error: errorMessage ?? undefined,
      summary: summarizeBatchResults(job.results),
      results: job.results.map((entry) => ({
        title: entry.title,
        detailUrl: entry.detailUrl,
        status: entry.status,
        message: entry.message
      }))
    })

    activeJobs.delete(job.sourceTabId)
  }

  async function submitPreparedResults(
    job: BatchJob,
    preparedSubmissions: ClassifiedBatchResult[]
  ): Promise<void> {
    const { urlSubmissions, torrentFileSubmissions } = splitPreparedSubmissions(preparedSubmissions)

    if (urlSubmissions.length) {
      try {
        await dependencies.addUrlsToQb(
          job.settings,
          urlSubmissions.map((entry) => entry.submitUrl),
          getSavePathOption(job.savePath)
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
        markFailedSubmissions(urlSubmissions, job, failure)
      }
    }

    for (const entry of torrentFileSubmissions) {
      try {
        const torrent = await fetchTorrentForUpload(entry.submitUrl, dependencies.fetchImpl)
        await dependencies.addTorrentFilesToQb(job.settings, [torrent], getSavePathOption(job.savePath))

        entry.status = "submitted"
        entry.message = "Torrent file uploaded to qBittorrent."
        job.stats.submitted += 1
      } catch (error: unknown) {
        const failure = error instanceof Error ? error.message : String(error)
        markFailedSubmissions([entry], job, failure)
      }
    }
  }

  async function prepareBatchItem(
    job: BatchJob,
    item: BatchItem,
    seenHashes: Set<string>,
    seenUrls: Set<string>
  ): Promise<ClassifiedBatchResult> {
    const prepared = classifyPreparedBatchItem(item, job.settings, seenHashes, seenUrls)
    if (prepared) {
      return prepared
    }

    return classifyExtractionResult(
      item.sourceId,
      await dependencies.extractSingleItem(item, job.settings),
      job.settings,
      seenHashes,
      seenUrls
    )
  }

  return {
    activeJobs,
    startBatchDownload
  }
}

function splitPreparedSubmissions(preparedSubmissions: ClassifiedBatchResult[]): {
  urlSubmissions: ClassifiedBatchResult[]
  torrentFileSubmissions: ClassifiedBatchResult[]
} {
  const urlSubmissions: ClassifiedBatchResult[] = []
  const torrentFileSubmissions: ClassifiedBatchResult[] = []

  for (const entry of preparedSubmissions) {
    if (entry.deliveryMode === "torrent-file") {
      torrentFileSubmissions.push(entry)
      continue
    }

    urlSubmissions.push(entry)
  }

  return {
    urlSubmissions,
    torrentFileSubmissions
  }
}

function markFailedSubmissions(
  entries: ClassifiedBatchResult[],
  job: BatchJob,
  failure: string
): void {
  for (const entry of entries) {
    entry.status = "failed"
    entry.message = `qBittorrent submission failed: ${failure}`
    job.stats.failed += 1
  }
}

function getSavePathOption(savePath: string): { savePath?: string } | undefined {
  if (!savePath) {
    return undefined
  }

  return {
    savePath
  }
}

function classifyFailureReason(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("timeout") || lower.includes("超时")) return "timeout"
  if (lower.includes("parse") || lower.includes("解析")) return "parse_error"
  if (lower.includes("qb") || lower.includes("qbittorrent") || lower.includes("403")) return "qb_error"
  if (lower.includes("network") || lower.includes("网络") || lower.includes("fetch")) return "network_error"
  return "unknown"
}

function buildHistoryRecord(
  job: BatchJob,
  sourceId: SourceId
): TaskHistoryRecord {
  const siteName = SITE_CONFIG_META[sourceId]?.displayName ?? sourceId
  const dateStr = new Date().toISOString().split("T")[0]
  const recordId = createHistoryRecordId()
  
  const items = job.results.map((result, index) => ({
    id: createHistoryItemId(recordId, index),
    title: result.title,
    detailUrl: result.detailUrl,
    sourceId,
    magnetUrl: result.magnetUrl,
    torrentUrl: result.torrentUrl,
    hash: result.hash,
    status: (result.status === "submitted" ? "success" : result.status === "duplicate" ? "duplicate" : "failed") as "success" | "duplicate" | "failed",
    failure: result.status === "failed" ? {
      reason: classifyFailureReason(result.message) as "parse_error" | "timeout" | "qb_error" | "network_error" | "unknown",
      message: result.message,
      retryable: true,
      retryCount: 0
    } : undefined,
    deliveryMode: result.deliveryMode || "magnet"
  }))

  return {
    id: recordId,
    name: `${siteName} 批量提取 (${dateStr})`,
    sourceId,
    status: job.stats.failed > 0 ? "partial_failure" : "completed",
    createdAt: new Date().toISOString(),
    stats: {
      total: job.stats.total,
      success: job.stats.submitted,
      duplicated: job.stats.duplicated,
      failed: job.stats.failed
    },
    items,
    savePath: job.savePath || undefined,
    version: HISTORY_RECORD_VERSION
  }
}
