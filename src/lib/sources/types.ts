import type {
  BatchItem,
  DeliveryMode,
  ExtractionResult,
  SourceId
} from "../shared/types"

export type SourceSubscriptionScanCandidate = {
  sourceId: SourceId
  title: string
  detailUrl: string
  magnetUrl?: string
  torrentUrl?: string
  subgroup?: string
}

export type ExtractionContext = {
  execution: {
    retryCount: number
    injectTimeoutMs: number
    domSettleMs: number
  }
}

export type SourceAdapter = {
  id: SourceId
  displayName: string
  supportedDeliveryModes: readonly DeliveryMode[]
  defaultDeliveryMode: DeliveryMode
  matchesListPage: (url: URL) => boolean
  matchesDetailUrl: (url: URL) => boolean
  getDetailAnchors: (root: ParentNode, pageUrl: URL) => HTMLAnchorElement[]
  getBatchItemFromAnchor: (anchor: HTMLAnchorElement, pageUrl: URL) => BatchItem | null
  extractSingleItem: (item: BatchItem, context: ExtractionContext) => Promise<ExtractionResult>
}
