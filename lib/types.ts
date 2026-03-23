export type SourceId = "kisssub" | "dongmanhuayuan"

export type BatchEventStage =
  | "started"
  | "progress"
  | "submitting"
  | "completed"
  | "error"
  | "fatal"

export type BatchItem = {
  sourceId: SourceId
  detailUrl: string
  title: string
}

export type BatchLogStatus = "ready" | "submitted" | "duplicate" | "failed"

export type BatchLogItem = {
  title: string
  detailUrl?: string
  status: BatchLogStatus
  message: string
}

export type BatchStats = {
  total: number
  processed: number
  prepared: number
  submitted: number
  duplicated: number
  failed: number
}

export type Settings = {
  qbBaseUrl: string
  qbUsername: string
  qbPassword: string
  concurrency: number
  injectTimeoutMs: number
  domSettleMs: number
  retryCount: number
  remoteScriptUrl: string
  remoteScriptRevision: string
  lastSavePath: string
}

export type TestQbConnectionResult = {
  baseUrl: string
  version: string
}

export type ExtractionResult = {
  ok: boolean
  title: string
  detailUrl: string
  hash: string
  magnetUrl: string
  torrentUrl: string
  failureReason: string
}

export type ClassifiedBatchResult = ExtractionResult & {
  status: BatchLogStatus
  submitKind: "" | "magnet" | "torrent"
  submitUrl: string
  message: string
}

export type BatchSummary = {
  submitted: number
  duplicated: number
  failed: number
}

export type BatchEventPayload = {
  stage: BatchEventStage
  stats: BatchStats
  message?: string
  error?: string
  item?: BatchLogItem
  summary?: BatchSummary
  results?: BatchLogItem[]
}
