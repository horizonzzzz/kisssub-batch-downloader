import { getBrowser } from "../shared/browser"
import { DEFAULT_FILTER_CONFIG } from "./defaults"
import type { FilterConfig } from "./types"
import { sanitizeFilterConfig } from "./presentation"

const FILTER_CONFIG_STORAGE_KEY = "filter_config"

export async function ensureFilterConfig(): Promise<void> {
  const stored = await getBrowser().storage.local.get(FILTER_CONFIG_STORAGE_KEY)
  if (!stored[FILTER_CONFIG_STORAGE_KEY]) {
    await getBrowser().storage.local.set({
      [FILTER_CONFIG_STORAGE_KEY]: DEFAULT_FILTER_CONFIG
    })
  }
}

export async function getFilterConfig(): Promise<FilterConfig> {
  await ensureFilterConfig()
  const stored = await getBrowser().storage.local.get(FILTER_CONFIG_STORAGE_KEY)
  return sanitizeFilterConfig(stored[FILTER_CONFIG_STORAGE_KEY] ?? DEFAULT_FILTER_CONFIG)
}

export async function saveFilterConfig(config: FilterConfig): Promise<FilterConfig> {
  const sanitized = sanitizeFilterConfig(config)
  await getBrowser().storage.local.set({
    [FILTER_CONFIG_STORAGE_KEY]: sanitized
  })
  return sanitized
}