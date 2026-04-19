import { decideFilterAction } from "../filter-rules"
import { normalizeSavePath } from "../settings"
import { getSourceConfig } from "../sources/config"
import { getDisabledSources } from "../sources/config/selectors"
import { getDownloaderConfig } from "../downloader/config/storage"
import { getBatchExecutionConfig } from "../batch-config/storage"
import { getFilterConfig } from "../filter-rules/storage"
import {
  classifyExtractionResult,
  createPreparedExtractionResult
} from "../download-preparation"
import type { StartBatchDownloadSuccessResponse } from "../shared/messages"
import type { BatchItem, ClassifiedBatchResult, FilterEntry } from "../shared/types"
import type { SourceConfig } from "../sources/config/types"
import type { BatchExecutionConfig } from "../batch-config/types"
import type { BatchRuntimeContext } from "./types"
import { createBatchJob, buildBatchRuntimeContext, recordBatchResult, summarizeBatchResults } from "./job-state"
import { getBatchStartedMessage, getBatchSubmittingMessage } from "./messages"
import { normalizeBatchItems } from "./preparation"
import { fetchTorrentForUpload } from "./torrent-file"
import type { BackgroundBatchDependencies, BatchJob } from "./types"
import { persistBatchHistory } from "./history-builder"
import type { DownloaderUrlSubmissionResult } from "../downloader"

async function getBatchRuntimeContext(): Promise<BatchRuntimeContext> {
  const [executionConfig, filterConfig, downloaderConfig, sourceConfig] = await Promise.all([
    getBatchExecutionConfig(),
    getFilterConfig(),
    getDownloaderConfig(),
    getSourceConfig()
  ])

  return buildBatchRuntimeContext(
    executionConfig,
    filterConfig.rules,
    downloaderConfig,
    sourceConfig
  )
}

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
    await dependencies.saveBatchUiPreferences({ lastSavePath: savePath })

    const runtimeContext = await getBatchRuntimeContext()
    const sourceConfig = await getSourceConfig()
    const disabledSources = getDisabledSources(
      Array.from(new Set(normalizedItems.map((item) => item.sourceId))),
      sourceConfig
    )
    if (disabledSources.length) {
      throw new Error(`Batch downloads are disabled for source: ${disabledSources.join(", ")}`)
    }

    const job = createBatchJob(sourceTabId, normalizedItems.length, runtimeContext, sourceConfig, savePath)
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
    const workerCount = Math.min(job.runtimeContext.execution.concurrency, pending.length)

    const workers = Array.from({ length: workerCount }, () =>
      processQueue(job, pending, preparedSubmissions, seenHashes, seenUrls)
    )

    await Promise.all(workers)

    if (preparedSubmissions.length) {
      await dependencies.sendBatchEvent(job.sourceTabId, {
        stage: "submitting",
        stats: job.stats,
        message: getBatchSubmittingMessage(preparedSubmissions.length, job.savePath)
      })

      try {
        const downloaderConfig = job.runtimeContext.downloaderConfig
        await dependencies.ensureDownloaderPermission(downloaderConfig)
        const downloader = dependencies.getDownloader(downloaderConfig)
        await downloader.authenticate(downloaderConfig)
        await submitPreparedResults(job, preparedSubmissions)
      } catch (error: unknown) {
        const failure = error instanceof Error ? error.message : String(error)
        markFailedSubmissions(preparedSubmissions, job, failure)
      }
    }

    await finalizeBatch(job, null)
    const sourceId = items[0]?.sourceId ?? "kisssub"
    persistBatchHistory(job, sourceId)
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
    const downloaderConfig = job.runtimeContext.downloaderConfig
    const downloader = dependencies.getDownloader(downloaderConfig)
    const { urlSubmissions, torrentFileSubmissions } = splitPreparedSubmissions(preparedSubmissions)

    if (urlSubmissions.length) {
      try {
        const submissionResult = await downloader.addUrls(
          downloaderConfig,
          urlSubmissions.map((entry) => entry.submitUrl),
          getSavePathOption(job.savePath)
        )
        applyUrlSubmissionResults(urlSubmissions, submissionResult, job)
      } catch (error: unknown) {
        const failure = error instanceof Error ? error.message : String(error)
        markFailedSubmissions(urlSubmissions, job, failure)
      }
    }

    for (const entry of torrentFileSubmissions) {
      try {
        const torrent = await fetchTorrentForUpload(entry.submitUrl, dependencies.fetchImpl)
        await downloader.addTorrentFiles(
          downloaderConfig,
          [torrent],
          getSavePathOption(job.savePath)
        )

        entry.status = "submitted"
        entry.message = "Torrent file uploaded to the downloader."
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
    const preparedResult = createPreparedExtractionResult(item)
    if (preparedResult) {
      const blockedPreparedResult = classifyBlockedBatchResult(item, preparedResult, job)
      if (blockedPreparedResult) {
        return blockedPreparedResult
      }

      return classifyExtractionResult(item.sourceId, preparedResult, job.sourceConfig, seenHashes, seenUrls)
    }

    const extractedResult = await dependencies.extractSingleItem(item, job.runtimeContext.extractionContext)
    if (extractedResult.ok) {
      const blockedExtractedResult = classifyBlockedBatchResult(item, extractedResult, job)
      if (blockedExtractedResult) {
        return blockedExtractedResult
      }
    }

    return classifyExtractionResult(
      item.sourceId,
      extractedResult,
      job.sourceConfig,
      seenHashes,
      seenUrls
    )
  }

  return {
    activeJobs,
    startBatchDownload
  }
}

function classifyBlockedBatchResult(
  originalItem: BatchItem,
  result: Pick<ClassifiedBatchResult, "title" | "detailUrl" | "hash" | "magnetUrl" | "torrentUrl">,
  job: BatchJob
): ClassifiedBatchResult | null {
  const filterDecision = decideFilterAction({
    sourceId: originalItem.sourceId,
    title: originalItem.title,
    filters: job.runtimeContext.filters
  })
  if (filterDecision.accepted) {
    return null
  }

  return {
    ok: false,
    title: originalItem.title,
    detailUrl: result.detailUrl,
    hash: result.hash || "",
    magnetUrl: result.magnetUrl || "",
    torrentUrl: result.torrentUrl || "",
    failureReason: "filtered_out",
    status: "failed",
    deliveryMode: "",
    submitUrl: "",
    message: filterDecision.message || "Blocked by filters: no filter matched"
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
    entry.message = `Downloader submission failed: ${failure}`
    job.stats.failed += 1
  }
}

function applyUrlSubmissionResults(
  entries: ClassifiedBatchResult[],
  result: DownloaderUrlSubmissionResult,
  job: BatchJob
): void {
  for (const [index, entry] of entries.entries()) {
    const reportedEntry = result.entries[index]

    if (!reportedEntry) {
      entry.status = "failed"
      entry.message = "Downloader submission failed: Downloader did not report a submission result."
      job.stats.failed += 1
      continue
    }

    if (reportedEntry.status === "submitted") {
      entry.status = "submitted"
      entry.message =
        entry.deliveryMode === "magnet"
          ? "Magnet queued in the downloader."
          : "Torrent URL queued in the downloader."
      job.stats.submitted += 1
      continue
    }

    entry.status = "failed"
    entry.message = `Downloader submission failed: ${
      reportedEntry.error ?? "Unknown downloader submission failure."
    }`
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
