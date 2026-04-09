import { SOURCE_IDS } from "../sources/catalog"
import type { OptionsRoutePath } from "./options-routes"
import type { DownloaderId, SourceId } from "./types"

export const POPUP_HELP_URL = "https://github.com/horizonzzzz/anime-bt-batch-downloader"

export type PopupOptionsRoute = OptionsRoutePath

export type PopupSupportedSiteViewModel = {
  id: SourceId
  label: string
  displayName: string
  url: string
  enabled: boolean
}

export type PopupActiveTabViewModel = {
  url: string | null
  sourceId: SourceId | null
  supported: boolean
  enabled: boolean
  batchRunning: boolean
}

export type PopupDownloaderConnectionStatus = "idle" | "checking" | "ready" | "failed"

export type PopupStateViewModel = {
  downloaderConnectionStatus: PopupDownloaderConnectionStatus
  currentDownloaderId: DownloaderId
  currentDownloaderName: string
  activeTab: PopupActiveTabViewModel
  supportedSites: PopupSupportedSiteViewModel[]
  version: string
  helpUrl: string
}

export const POPUP_SUPPORTED_SITE_IDS = SOURCE_IDS
