import type { BatchItem, ExtractionResult, Settings, SourceId } from "../types"

export type SourceAdapter = {
  id: SourceId
  displayName: string
  matchesListPage: (url: URL) => boolean
  matchesDetailUrl: (url: URL) => boolean
  getDetailAnchors: (root: ParentNode, pageUrl: URL) => HTMLAnchorElement[]
  getBatchItemFromAnchor: (anchor: HTMLAnchorElement, pageUrl: URL) => BatchItem | null
  extractSingleItem: (item: BatchItem, settings: Settings) => Promise<ExtractionResult>
}
