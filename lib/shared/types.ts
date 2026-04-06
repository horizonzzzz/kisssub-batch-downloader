export type SourceId = "kisssub" | "dongmanhuayuan" | "acgrip" | "bangumimoe"

export type DeliveryMode = "magnet" | "torrent-url" | "torrent-file"

export type FilterConditionField = "title" | "subgroup" | "source"

export type FilterCondition = {
  id: string
  field: "title" | "subgroup"
  operator: "contains"
  value: string
} | {
  id: string
  field: "source"
  operator: "is"
  value: SourceId
}

export type FilterConditionOperator = FilterCondition["operator"]

export type FilterEntry = {
  id: string
  name: string
  enabled: boolean
  must: FilterCondition[]
  any: FilterCondition[]
}

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
  magnetUrl?: string
  torrentUrl?: string
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

export type DownloaderId = "qbittorrent" | "transmission"

export type QbittorrentSettings = {
  baseUrl: string
  username: string
  password: string
}

export type TransmissionSettings = {
  baseUrl: string
  username: string
  password: string
}

export type Settings = {
  currentDownloaderId: DownloaderId
  downloaders: {
    qbittorrent: QbittorrentSettings
    transmission: TransmissionSettings
  }
  concurrency: number
  injectTimeoutMs: number
  domSettleMs: number
  retryCount: number
  remoteScriptUrl: string
  remoteScriptRevision: string
  lastSavePath: string
  sourceDeliveryModes: Partial<Record<SourceId, DeliveryMode>>
  enabledSources: Partial<Record<SourceId, boolean>>
  filters: FilterEntry[]
}

export type TestDownloaderConnectionResult = {
  downloaderId: DownloaderId
  displayName: string
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
  deliveryMode: "" | DeliveryMode
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
