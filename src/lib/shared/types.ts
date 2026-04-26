export type SourceId = "kisssub" | "dongmanhuayuan" | "acgrip" | "bangumimoe" | "comicat"

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
  createdAt: string
  baselineCreatedAt: string
  deletedAt: string | null
}

export type CreateSubscriptionInput = Pick<
  SubscriptionEntry,
  | "name"
  | "enabled"
  | "sourceIds"
  | "multiSiteModeEnabled"
  | "titleQuery"
  | "subgroupQuery"
  | "advanced"
>

export type EditableSubscriptionDefinition = CreateSubscriptionInput

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
  readAt: string | null
  resolvedAt: string | null
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
  hits: SubscriptionNotificationHit[]
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

export type DownloaderValidationSnapshot = {
  configFingerprint: string
  validatedAt: string
  version: string
}

export type DownloaderValidationState = Partial<Record<DownloaderId, DownloaderValidationSnapshot>>

export type GeneralSettingsValidationResult = DownloaderValidationSnapshot & {
  downloaderId: DownloaderId
  reusedExisting: boolean
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
