import type { DownloaderAdapter } from "../downloader"
import type {
  BatchEventPayload,
  BatchItem,
  BatchStats,
  ClassifiedBatchResult,
  ExtractionResult,
  Settings
} from "../shared/types"

export type BatchJob = {
  sourceTabId: number
  stats: BatchStats
  results: ClassifiedBatchResult[]
  settings: Settings
  savePath: string
}

export type BackgroundBatchDependencies = {
  saveSettings: (partialSettings: Partial<Settings>) => Promise<Settings>
  extractSingleItem: (item: BatchItem, settings: Settings) => Promise<ExtractionResult>
  sendBatchEvent: (tabId: number, payload: BatchEventPayload) => Promise<void>
  getDownloader: (settings: Settings) => DownloaderAdapter
  fetchImpl?: typeof fetch
}
