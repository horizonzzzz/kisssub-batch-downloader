import type { BatchItem, DeliveryMode, ExtractionResult, Settings, SourceId } from "../shared/types"

export type SourceAdapter = {
  id: SourceId
  displayName: string
  supportedDeliveryModes: readonly DeliveryMode[]
  defaultDeliveryMode: DeliveryMode
  matchesListPage: (url: URL) => boolean
  matchesDetailUrl: (url: URL) => boolean
  getDetailAnchors: (root: ParentNode, pageUrl: URL) => HTMLAnchorElement[]
  getBatchItemFromAnchor: (anchor: HTMLAnchorElement, pageUrl: URL) => BatchItem | null
  extractSingleItem: (item: BatchItem, settings: Settings) => Promise<ExtractionResult>
}
