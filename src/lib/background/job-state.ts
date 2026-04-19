import type { BatchJob } from "./types"
import type { AppSettings, BatchStats, BatchSummary, ClassifiedBatchResult } from "../shared/types"
import type { SourceConfig } from "../sources/config/types"

export function createBatchJob(
  sourceTabId: number,
  total: number,
  settings: AppSettings,
  sourceConfig: SourceConfig,
  savePath: string
): BatchJob {
  return {
    sourceTabId,
    stats: createBatchStats(total),
    results: [],
    settings: {
      ...settings,
      lastSavePath: savePath
    },
    sourceConfig,
    savePath
  }
}

export function createBatchStats(total: number): BatchStats {
  return {
    total,
    processed: 0,
    prepared: 0,
    submitted: 0,
    duplicated: 0,
    failed: 0
  }
}

export function recordBatchResult(job: BatchJob, classified: ClassifiedBatchResult): void {
  job.results.push(classified)
  job.stats.processed += 1

  if (classified.status === "ready") {
    job.stats.prepared += 1
    return
  }

  if (classified.status === "duplicate") {
    job.stats.duplicated += 1
    return
  }

  if (classified.status === "failed") {
    job.stats.failed += 1
  }
}

export function summarizeBatchResults(results: ClassifiedBatchResult[]): BatchSummary {
  return {
    submitted: results.filter((entry) => entry.status === "submitted").length,
    duplicated: results.filter((entry) => entry.status === "duplicate").length,
    failed: results.filter((entry) => entry.status === "failed").length
  }
}
