import type { DownloaderAdapter } from "../downloader"
import type {
  AppSettings,
  BatchEventPayload,
  BatchItem,
  BatchStats,
  ClassifiedBatchResult,
  ExtractionResult
} from "../shared/types"
import type { SourceConfig } from "../sources/config/types"

export type BatchJob = {
  sourceTabId: number
  stats: BatchStats
  results: ClassifiedBatchResult[]
  settings: AppSettings
  sourceConfig: SourceConfig
  savePath: string
}

export type BackgroundBatchDependencies = {
  saveSettings: (partialSettings: Partial<AppSettings>) => Promise<AppSettings>
  extractSingleItem: (item: BatchItem, settings: AppSettings) => Promise<ExtractionResult>
  sendBatchEvent: (tabId: number, payload: BatchEventPayload) => Promise<void>
  getDownloader: (settings: AppSettings) => DownloaderAdapter
  ensureDownloaderPermission: (settings: AppSettings) => Promise<void>
  fetchImpl?: typeof fetch
}
