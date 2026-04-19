import type { DownloaderAdapter } from "../downloader"
import type { DownloaderConfig } from "../downloader/config/types"
import type {
  BatchEventPayload,
  BatchItem,
  BatchStats,
  ClassifiedBatchResult,
  ExtractionResult,
  FilterEntry
} from "../shared/types"
import type { SourceConfig } from "../sources/config/types"
import type { BatchExecutionConfig } from "../batch-config/types"
import type { ExtractionContext } from "../sources/types"

export type BatchRuntimeContext = {
  execution: BatchExecutionConfig
  filters: FilterEntry[]
  downloaderConfig: DownloaderConfig
  extractionContext: ExtractionContext
}

export type BatchJob = {
  sourceTabId: number
  stats: BatchStats
  results: ClassifiedBatchResult[]
  runtimeContext: BatchRuntimeContext
  sourceConfig: SourceConfig
  savePath: string
}

export type BackgroundBatchDependencies = {
  saveBatchUiPreferences: (preferences: { lastSavePath: string }) => Promise<{ lastSavePath: string }>
  extractSingleItem: (item: BatchItem, context: ExtractionContext) => Promise<ExtractionResult>
  sendBatchEvent: (tabId: number, payload: BatchEventPayload) => Promise<void>
  getDownloader: (config: DownloaderConfig) => DownloaderAdapter
  ensureDownloaderPermission: (config: DownloaderConfig) => Promise<void>
  fetchImpl?: typeof fetch
}
