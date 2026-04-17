import { getDownloaderAdapter, getDownloaderMeta } from "../downloader"
import { ensureDownloaderPermission } from "../downloader/permissions"
import { getSettings, mergeSettings, sanitizeSettings } from "../settings"
import type { AppSettings, TestDownloaderConnectionResult } from "../shared/types"

export async function testDownloaderConnection(
  overrideSettings: Partial<AppSettings> | null,
  options?: {
    interactivePermissionRequest?: boolean
  }
): Promise<TestDownloaderConnectionResult> {
  const settings = sanitizeSettings(mergeSettings(await getSettings(), overrideSettings))
  const interactivePermissionRequest =
    options?.interactivePermissionRequest ?? overrideSettings == null

  const downloaderId = settings.currentDownloaderId
  const adapter = getDownloaderAdapter(downloaderId)
  const meta = getDownloaderMeta(downloaderId)
  await ensureDownloaderPermission(
    settings,
    interactivePermissionRequest ? { interactive: true } : undefined
  )
  const result = await adapter.testConnection(settings)

  return {
    downloaderId,
    displayName: meta.displayName,
    baseUrl: result.baseUrl,
    version: result.version
  }
}
