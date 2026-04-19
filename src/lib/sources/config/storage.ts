import { getBrowser } from "../../shared/browser"
import { DEFAULT_SOURCE_CONFIG } from "./defaults"
import { sanitizeSourceConfig } from "./schema"
import type { SourceConfig } from "./types"

const SOURCE_CONFIG_STORAGE_KEY = "source_config"

export async function getSourceConfig(): Promise<SourceConfig> {
  const stored = await getBrowser().storage.local.get(SOURCE_CONFIG_STORAGE_KEY)
  return sanitizeSourceConfig(stored[SOURCE_CONFIG_STORAGE_KEY] ?? DEFAULT_SOURCE_CONFIG)
}

export async function saveSourceConfig(config: SourceConfig): Promise<SourceConfig> {
  const sanitized = sanitizeSourceConfig(config)
  await getBrowser().storage.local.set({
    [SOURCE_CONFIG_STORAGE_KEY]: sanitized
  })
  return sanitized
}