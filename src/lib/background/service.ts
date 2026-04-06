import { getDownloaderAdapter, getDownloaderMeta } from "../downloader"
import { getSettings, mergeSettings, sanitizeSettings } from "../settings"
import type { Settings, TestDownloaderConnectionResult } from "../shared/types"

export async function testDownloaderConnection(
  overrideSettings: Partial<Settings> | null
): Promise<TestDownloaderConnectionResult> {
  const settings = sanitizeSettings(mergeSettings(await getSettings(), overrideSettings))

  const downloaderId = settings.currentDownloaderId
  const adapter = getDownloaderAdapter(downloaderId)
  const meta = getDownloaderMeta(downloaderId)
  const result = await adapter.testConnection(settings)

  return {
    downloaderId,
    displayName: meta.displayName,
    baseUrl: result.baseUrl,
    version: result.version
  }
}
