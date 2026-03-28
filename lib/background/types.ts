import type { QbTorrentFile } from "../downloader/qb"
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
  loginQb: (settings: Settings) => Promise<void>
  addUrlsToQb: (
    settings: Settings,
    urls: string[],
    options?: {
      savePath?: string
    }
  ) => Promise<void>
  addTorrentFilesToQb: (
    settings: Settings,
    torrents: QbTorrentFile[],
    options?: {
      savePath?: string
    }
  ) => Promise<void>
  fetchImpl?: typeof fetch
}
