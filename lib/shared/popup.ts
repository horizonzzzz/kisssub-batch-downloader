import { SOURCE_IDS } from "../sources/catalog"
import { SITE_CONFIG_META } from "../sources/site-meta"
import type { OptionsRoutePath } from "./options-routes"
import type { SourceId } from "./types"

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
}

export type PopupQbConnectionStatus = "idle" | "checking" | "ready" | "failed"

export type PopupStateViewModel = {
  qbConnectionStatus: PopupQbConnectionStatus
  activeTab: PopupActiveTabViewModel
  supportedSites: PopupSupportedSiteViewModel[]
  version: string
  helpUrl: string
}

export const POPUP_SUPPORTED_SITE_IDS = SOURCE_IDS

export const POPUP_SUPPORTED_SITE_META = SITE_CONFIG_META
