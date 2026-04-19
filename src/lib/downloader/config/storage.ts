import { getBrowser } from "../../shared/browser"
import { DEFAULT_DOWNLOADER_CONFIG } from "./defaults"
import { downloaderConfigSchema } from "./schema"
import type { DownloaderConfig } from "./types"

const DOWNLOADER_CONFIG_STORAGE_KEY = "downloader_config"

export async function getDownloaderConfig(): Promise<DownloaderConfig> {
  const extensionBrowser = getBrowser()
  const stored = await extensionBrowser.storage.local.get(DOWNLOADER_CONFIG_STORAGE_KEY)

  if (stored[DOWNLOADER_CONFIG_STORAGE_KEY]) {
    try {
      return downloaderConfigSchema.parse(stored[DOWNLOADER_CONFIG_STORAGE_KEY])
    } catch {
      await extensionBrowser.storage.local.set({
        [DOWNLOADER_CONFIG_STORAGE_KEY]: DEFAULT_DOWNLOADER_CONFIG
      })
      return DEFAULT_DOWNLOADER_CONFIG
    }
  }

  await extensionBrowser.storage.local.set({
    [DOWNLOADER_CONFIG_STORAGE_KEY]: DEFAULT_DOWNLOADER_CONFIG
  })
  return DEFAULT_DOWNLOADER_CONFIG
}

export async function saveDownloaderConfig(config: DownloaderConfig): Promise<DownloaderConfig> {
  const sanitized = downloaderConfigSchema.parse(config)
  await getBrowser().storage.local.set({
    [DOWNLOADER_CONFIG_STORAGE_KEY]: sanitized
  })
  return sanitized
}
