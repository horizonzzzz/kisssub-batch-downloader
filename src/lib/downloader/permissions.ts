import { getDownloaderMeta } from "./registry"
import { i18n } from "../i18n"
import { getBrowser } from "../shared/browser"
import type { Settings } from "../shared/types"

type DownloaderPermissionSettings = Pick<Settings, "currentDownloaderId" | "downloaders">

type PermissionsApi = {
  contains: (permissions: { origins: string[] }) => Promise<boolean>
  request: (permissions: { origins: string[] }) => Promise<boolean>
}

function getCurrentDownloaderBaseUrl(settings: DownloaderPermissionSettings): string {
  return settings.currentDownloaderId === "transmission"
    ? settings.downloaders.transmission.baseUrl
    : settings.downloaders.qbittorrent.baseUrl
}

function getPermissionErrorMessage(
  settings: DownloaderPermissionSettings,
  translationKey: "required" | "denied"
): string {
  const downloaderName = getDownloaderMeta(settings.currentDownloaderId).displayName
  const baseUrl = getCurrentDownloaderBaseUrl(settings)

  return i18n.t(`downloader.permissions.${translationKey}`, [downloaderName, baseUrl])
}

export function getDownloaderPermissionOrigins(settings: DownloaderPermissionSettings): string[] {
  const baseUrl = getCurrentDownloaderBaseUrl(settings)

  let parsedUrl: URL
  try {
    parsedUrl = new URL(baseUrl)
  } catch {
    throw new Error(i18n.t("downloader.permissions.invalidUrl", [baseUrl]))
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(i18n.t("downloader.permissions.invalidUrl", [baseUrl]))
  }

  return [`${parsedUrl.protocol}//${parsedUrl.hostname}/*`]
}

export async function ensureDownloaderPermission(
  settings: DownloaderPermissionSettings,
  options?: {
    interactive?: boolean
    permissionsApi?: PermissionsApi
  }
): Promise<void> {
  const permissionsApi = options?.permissionsApi ?? (getBrowser().permissions as PermissionsApi)
  const origins = getDownloaderPermissionOrigins(settings)

  if (await permissionsApi.contains({ origins })) {
    return
  }

  if (options?.interactive) {
    if (await permissionsApi.request({ origins })) {
      return
    }

    throw new Error(getPermissionErrorMessage(settings, "denied"))
  }

  throw new Error(getPermissionErrorMessage(settings, "required"))
}

export async function requestDownloaderPermission(
  settings: DownloaderPermissionSettings,
  permissionsApi?: PermissionsApi
): Promise<void> {
  await ensureDownloaderPermission(settings, {
    interactive: true,
    permissionsApi
  })
}
