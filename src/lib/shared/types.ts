export type SourceId = "kisssub" | "dongmanhuayuan" | "acgrip" | "bangumimoe"

export type DeliveryMode = "magnet" | "torrent-url" | "torrent-file"

export type FilterConditionField = "title" | "subgroup"

export type FilterCondition = {
  id: string
  field: "title" | "subgroup"
  operator: "contains"
  value: string
}

export type FilterConditionOperator = FilterCondition["operator"]

export type FilterEntry = {
  id: string
  name: string
  enabled: boolean
  sourceIds: SourceId[]
  must: FilterCondition[]
  any: FilterCondition[]
}

export type SubscriptionDeliveryMode = "direct-only" | "allow-detail-extraction"

export type SubscriptionEntry = {
  id: string
  name: string
  enabled: boolean
  sourceIds: SourceId[]
  multiSiteModeEnabled: boolean
  titleQuery: string
  subgroupQuery: string
  advanced: {
    must: FilterCondition[]
    any: FilterCondition[]
  }
  deliveryMode: SubscriptionDeliveryMode
  createdAt: string
  baselineCreatedAt: string
}

export type EditableSubscriptionDefinition = Pick<
  SubscriptionEntry,
  | "id"
  | "enabled"
  | "sourceIds"
  | "multiSiteModeEnabled"
  | "titleQuery"
  | "subgroupQuery"
  | "advanced"
  | "deliveryMode"
>

export type SubscriptionHitRecord = {
  id: string
  subscriptionId: string
  sourceId: SourceId
  title: string
  normalizedTitle: string
  subgroup: string
  detailUrl: string
  magnetUrl: string
  torrentUrl: string
  discoveredAt: string
  downloadedAt: string | null
  downloadStatus: "idle" | "submitted" | "duplicate" | "failed"
}

export type SubscriptionRuntimeState = {
  lastScanAt: string | null
  lastMatchedAt: string | null
  lastError: string
  seenFingerprints: string[]
  recentHits: SubscriptionHitRecord[]
}

export type SubscriptionNotificationHit = SubscriptionHitRecord

export type SubscriptionNotificationRound = {
  id: string
  createdAt: string
  hitIds: string[]
  hits?: SubscriptionNotificationHit[]
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

export type AppSettings = {
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
  subscriptionsEnabled: boolean
  pollingIntervalMinutes: number
  notificationsEnabled: boolean
  notificationDownloadActionEnabled: boolean
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
