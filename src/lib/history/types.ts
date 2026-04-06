import type { DeliveryMode, DownloaderId, SourceId } from "../shared/types"

export type TaskHistoryStatus = "completed" | "partial_failure"

export type TaskItemStatus = "success" | "duplicate" | "failed"

export type FailureReason =
  | "parse_error"
  | "timeout"
  | "qb_error"
  | "network_error"
  | "filtered_out"
  | "unknown"

export type FailureInfo = {
  reason: FailureReason
  message: string
  retryable: boolean
  retryCount: number
  lastRetryAt?: string
}

export type TaskHistoryItem = {
  id: string
  title: string
  detailUrl: string
  sourceId: SourceId
  magnetUrl?: string
  torrentUrl?: string
  hash?: string
  status: TaskItemStatus
  message?: string
  submittedAt?: string
  failure?: FailureInfo
  deliveryMode: DeliveryMode
}

export type TaskHistoryRecord = {
  id: string
  name: string
  sourceId: SourceId
  originalDownloaderId?: DownloaderId
  lastRetriedDownloaderId?: DownloaderId
  status: TaskHistoryStatus
  createdAt: string
  completedAt?: string
  stats: {
    total: number
    success: number
    duplicated: number
    failed: number
  }
  items: TaskHistoryItem[]
  savePath?: string
  version: number
}

export type HistoryStorage = {
  records: TaskHistoryRecord[]
  maxRecords: number
  lastCleanupAt?: string
}

export const HISTORY_STORAGE_KEY = "task_history"
export const DEFAULT_MAX_RECORDS = 100
export const HISTORY_RECORD_VERSION = 1
