import {
  createHistoryItemId,
  createHistoryRecordId,
  saveTaskHistory
} from "../history/storage"
import {
  HISTORY_RECORD_VERSION,
  type FailureInfo,
  type FailureReason,
  type TaskHistoryRecord
} from "../history/types"
import type { SourceId } from "../shared/types"
import { SITE_CONFIG_META } from "../sources/site-meta"
import type { BatchJob } from "./types"

function classifyFailureReason(
  result: BatchJob["results"][number]
): FailureReason {
  if (result.failureReason === "filtered_out") {
    return "filtered_out"
  }

  const lower = `${result.failureReason} ${result.message}`.toLowerCase()
  if (lower.includes("timeout") || lower.includes("超时")) return "timeout"
  if (lower.includes("parse") || lower.includes("解析")) return "parse_error"
  if (lower.includes("qb") || lower.includes("qbittorrent") || lower.includes("403")) return "qb_error"
  if (lower.includes("network") || lower.includes("网络") || lower.includes("fetch")) return "network_error"
  return "unknown"
}

function buildFailureInfo(result: BatchJob["results"][number]): FailureInfo | undefined {
  if (result.status !== "failed") {
    return undefined
  }

  const reason = classifyFailureReason(result)

  return {
    reason,
    message: result.message,
    retryable: reason !== "filtered_out",
    retryCount: 0
  }
}

function mapItemStatus(
  status: string
): "success" | "duplicate" | "failed" {
  if (status === "submitted") return "success"
  if (status === "duplicate") return "duplicate"
  return "failed"
}

function buildHistoryItems(
  results: BatchJob["results"],
  recordId: string,
  sourceId: SourceId
): TaskHistoryRecord["items"] {
  return results.map((result, index) => ({
    id: createHistoryItemId(recordId, index),
    title: result.title,
    detailUrl: result.detailUrl,
    sourceId,
    message: result.message,
    magnetUrl: result.magnetUrl,
    torrentUrl: result.torrentUrl,
    hash: result.hash,
    status: mapItemStatus(result.status),
    failure: buildFailureInfo(result),
    deliveryMode: result.deliveryMode || "magnet"
  }))
}

export function buildHistoryRecord(
  job: BatchJob,
  sourceId: SourceId
): TaskHistoryRecord {
  const siteName = SITE_CONFIG_META[sourceId]?.displayName ?? sourceId
  const dateStr = new Date().toISOString().split("T")[0]
  const recordId = createHistoryRecordId()
  const items = buildHistoryItems(job.results, recordId, sourceId)

  return {
    id: recordId,
    name: `${siteName} 批量提取 (${dateStr})`,
    sourceId,
    originalDownloaderId: job.settings.currentDownloaderId,
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

export function persistBatchHistory(
  job: BatchJob,
  sourceId: SourceId
): void {
  const record = buildHistoryRecord(job, sourceId)
  saveTaskHistory(record).catch((err) =>
    console.warn("Failed to save task history:", err)
  )
}
