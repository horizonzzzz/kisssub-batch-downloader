import type { BatchExecutionConfig } from "../batch-config/types"
import { BATCH_EXECUTION_CONFIG_STORAGE_KEY } from "../batch-config/storage"
import { batchExecutionConfigSchema } from "../batch-config/schema"
import type { DownloaderConfig } from "../downloader/config/types"
import { DOWNLOADER_CONFIG_STORAGE_KEY } from "../downloader/config/storage"
import { downloaderConfigSchema } from "../downloader/config/schema"
import { getBrowser } from "../shared/browser"

export type GeneralSettingsSavePayload = {
  downloaderConfig: DownloaderConfig
  batchExecutionConfig: BatchExecutionConfig
}

export async function saveGeneralSettings({
  downloaderConfig,
  batchExecutionConfig
}: GeneralSettingsSavePayload): Promise<GeneralSettingsSavePayload> {
  const sanitizedDownloaderConfig = downloaderConfigSchema.parse(downloaderConfig)
  const sanitizedBatchExecutionConfig = batchExecutionConfigSchema.parse(batchExecutionConfig)

  await getBrowser().storage.local.set({
    [DOWNLOADER_CONFIG_STORAGE_KEY]: sanitizedDownloaderConfig,
    [BATCH_EXECUTION_CONFIG_STORAGE_KEY]: sanitizedBatchExecutionConfig
  })

  return {
    downloaderConfig: sanitizedDownloaderConfig,
    batchExecutionConfig: sanitizedBatchExecutionConfig
  }
}
