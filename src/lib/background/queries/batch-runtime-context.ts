import { getDownloaderConfig } from "../../downloader/config/storage"
import { getBatchExecutionConfig } from "../../batch-config/storage"
import { getBatchUiPreferences } from "../../batch-preferences/storage"
import { getFilterConfig } from "../../filter-rules/storage"
import { getSourceConfig } from "../../sources/config/storage"
import type { DownloaderConfig } from "../../downloader/config/types"
import type { BatchExecutionConfig } from "../../batch-config/types"
import type { BatchUiPreferences } from "../../batch-preferences/types"
import type { FilterConfig } from "../../filter-rules/types"
import type { SourceConfig } from "../../sources/config/types"

export type BatchRuntimeContext = {
  downloader: DownloaderConfig
  execution: BatchExecutionConfig
  preferences: BatchUiPreferences
  filters: FilterConfig
  source: SourceConfig
}

export async function getBatchRuntimeContext(): Promise<BatchRuntimeContext> {
  const [downloader, execution, preferences, filters, source] = await Promise.all([
    getDownloaderConfig(),
    getBatchExecutionConfig(),
    getBatchUiPreferences(),
    getFilterConfig(),
    getSourceConfig()
  ])

  return {
    downloader,
    execution,
    preferences,
    filters,
    source
  }
}