import { getBrowser } from "../shared/browser"
import { DEFAULT_BATCH_EXECUTION_CONFIG } from "./defaults"
import { batchExecutionConfigSchema } from "./schema"
import type { BatchExecutionConfig } from "./types"

const BATCH_EXECUTION_CONFIG_STORAGE_KEY = "batch_execution_config"

type LegacyAppSettings = {
  concurrency?: number
  injectTimeoutMs?: number
  domSettleMs?: number
  retryCount?: number
}

function migrateFromLegacySettings(legacy: LegacyAppSettings): BatchExecutionConfig {
  return batchExecutionConfigSchema.parse({
    concurrency: legacy.concurrency ?? DEFAULT_BATCH_EXECUTION_CONFIG.concurrency,
    retryCount: legacy.retryCount ?? DEFAULT_BATCH_EXECUTION_CONFIG.retryCount,
    injectTimeoutMs: legacy.injectTimeoutMs ?? DEFAULT_BATCH_EXECUTION_CONFIG.injectTimeoutMs,
    domSettleMs: legacy.domSettleMs ?? DEFAULT_BATCH_EXECUTION_CONFIG.domSettleMs
  })
}

export async function getBatchExecutionConfig(): Promise<BatchExecutionConfig> {
  const extensionBrowser = getBrowser()
  const stored = await extensionBrowser.storage.local.get([
    BATCH_EXECUTION_CONFIG_STORAGE_KEY,
    "app_settings"
  ])

  // If batch_execution_config exists, use it directly
  if (stored[BATCH_EXECUTION_CONFIG_STORAGE_KEY]) {
    return batchExecutionConfigSchema.parse(stored[BATCH_EXECUTION_CONFIG_STORAGE_KEY])
  }

  // Migration: read from legacy app_settings fields
  const legacySettings = (stored["app_settings"] as LegacyAppSettings | undefined) ?? {}
  const migratedConfig = migrateFromLegacySettings(legacySettings)

  // Persist migrated config for future reads
  await extensionBrowser.storage.local.set({
    [BATCH_EXECUTION_CONFIG_STORAGE_KEY]: migratedConfig
  })

  return batchExecutionConfigSchema.parse(migratedConfig)
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