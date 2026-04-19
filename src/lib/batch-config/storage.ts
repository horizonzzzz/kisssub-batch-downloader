import { getBrowser } from "../shared/browser"
import { DEFAULT_BATCH_EXECUTION_CONFIG } from "./defaults"
import { batchExecutionConfigSchema } from "./schema"
import type { BatchExecutionConfig } from "./types"

export const BATCH_EXECUTION_CONFIG_STORAGE_KEY = "batch_execution_config"

export async function getBatchExecutionConfig(): Promise<BatchExecutionConfig> {
  const extensionBrowser = getBrowser()
  const stored = await extensionBrowser.storage.local.get(BATCH_EXECUTION_CONFIG_STORAGE_KEY)

  if (stored[BATCH_EXECUTION_CONFIG_STORAGE_KEY]) {
    try {
      return batchExecutionConfigSchema.parse(stored[BATCH_EXECUTION_CONFIG_STORAGE_KEY])
    } catch {
      await extensionBrowser.storage.local.set({
        [BATCH_EXECUTION_CONFIG_STORAGE_KEY]: DEFAULT_BATCH_EXECUTION_CONFIG
      })
      return DEFAULT_BATCH_EXECUTION_CONFIG
    }
  }

  await extensionBrowser.storage.local.set({
    [BATCH_EXECUTION_CONFIG_STORAGE_KEY]: DEFAULT_BATCH_EXECUTION_CONFIG
  })
  return DEFAULT_BATCH_EXECUTION_CONFIG
}

export async function saveBatchExecutionConfig(
  config: Partial<BatchExecutionConfig>
): Promise<BatchExecutionConfig> {
  const current = await getBatchExecutionConfig()
  const merged = batchExecutionConfigSchema.parse({
    ...current,
    ...config
  })

  await getBrowser().storage.local.set({
    [BATCH_EXECUTION_CONFIG_STORAGE_KEY]: merged
  })

  return merged
}
