export type SourceId = "kisssub" | "dongmanhuayuan" | "acgrip" | "bangumimoe"

export type DeliveryMode = "magnet" | "torrent-url" | "torrent-file"

export type FilterRuleAction = "include" | "exclude"

export type FilterConditionField = "title" | "subgroup" | "source"

export type FilterConditionOperator =
  | "contains"
  | "not_contains"
  | "is"
  | "is_not"
  | "regex"

export type FilterConditionRelation = "and" | "or"

export type FilterCondition = {
  id: string
  field: FilterConditionField
  operator: FilterConditionOperator
  value: string
}

export type FilterRule = {
  id: string
  name: string
  enabled: boolean
  action: FilterRuleAction
  relation: FilterConditionRelation
  conditions: FilterCondition[]
}

export type FilterRuleGroup = {
  id: string
  name: string
  description: string
  enabled: boolean
  rules: FilterRule[]
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

export type BatchLogStatus = "ready" | "submitted" | "duplicate" | "filtered" | "failed"

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
  filtered: number
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
  sourceDeliveryModes: Partial<Record<SourceId, DeliveryMode>>
  enabledSources: Partial<Record<SourceId, boolean>>
  filterGroups: FilterRuleGroup[]
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
  deliveryMode: "" | DeliveryMode
  submitUrl: string
  message: string
}

export type BatchSummary = {
  submitted: number
  duplicated: number
  filtered: number
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
