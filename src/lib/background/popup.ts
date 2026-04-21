import packageJson from "../../../package.json"
import { getDownloaderMeta } from "../downloader"
import { getSourceAdapterForPage } from "../sources"
import { getLocalizedSiteConfigMeta } from "../sources/site-meta"
import { getSourceConfig, saveSourceConfig } from "../sources/config"
import { resolveSourceEnabled } from "../sources/config/selectors"
import { getDownloaderConfig } from "../downloader/config/storage"
import {
  CONTENT_SETTINGS_CHANGED_EVENT,
  type ContentSettingsChangedMessage
} from "../shared/messages"
import { getBrowser, getExtensionUrl } from "../shared/browser"
import { DEFAULT_OPTIONS_ROUTE, isOptionsRoutePath, type OptionsRoutePath } from "../shared/options-routes"
import {
  POPUP_HELP_URL,
  POPUP_SUPPORTED_SITE_IDS,
  type PopupDownloaderConnectionStatus,
  type PopupStateViewModel
} from "../shared/popup"
import type { SourceId } from "../shared/types"
import type { SourceConfig } from "../sources/config/types"
import type { DownloaderConfig } from "../downloader/config/types"

type BuildPopupStateDependencies = {
  getSourceConfig: () => Promise<SourceConfig>
  getDownloaderConfig: () => Promise<DownloaderConfig>
  getActiveTabContext: () => Promise<{ id: number | null; url: string | null }>
  getExtensionVersion: () => string
  isBatchRunningInTab: (tabId: number) => boolean
}

type SetSourceEnabledDependencies = {
  getSourceConfig: () => Promise<SourceConfig>
  saveSourceConfig: (config: SourceConfig) => Promise<SourceConfig>
}

type OptionsTabTarget = {
  tabId: number
  windowId: number | null
}

type OpenOptionsPageDependencies = {
  queryOptionsTabs: () => Promise<OptionsTabTarget[]>
  updateTab: (tabId: number, url: string) => Promise<void>
  focusWindow: (windowId: number) => Promise<void>
  createTab: (url: string) => Promise<void>
  getExtensionUrl: (path: string) => string
}

type NotifySupportedSourceTabsOfContentSettingsChangeDependencies = {
  queryTabs: () => Promise<Array<{ id?: number; url?: string | null }>>
  sendMessageToTab: (tabId: number, message: ContentSettingsChangedMessage) => Promise<void>
}

const DEFAULT_BUILD_POPUP_STATE_DEPENDENCIES: BuildPopupStateDependencies = {
  getSourceConfig,
  getDownloaderConfig,
  getActiveTabContext: queryActiveTabContext,
  getExtensionVersion: () => packageJson.version,
  isBatchRunningInTab: () => false
}

const DEFAULT_SET_SOURCE_ENABLED_DEPENDENCIES: SetSourceEnabledDependencies = {
  getSourceConfig,
  saveSourceConfig
}

const DEFAULT_OPEN_OPTIONS_PAGE_DEPENDENCIES: OpenOptionsPageDependencies = {
  queryOptionsTabs: async () => {
    const extensionBrowser = getBrowser()
    const optionsTabs = await extensionBrowser.tabs.query({
      url: getExtensionUrl("options.html*")
    })

    return optionsTabs
      .map((tab) => {
        if (typeof tab.id !== "number") {
          return null
        }

        return {
          tabId: tab.id,
          windowId: typeof tab.windowId === "number" ? tab.windowId : null
        }
      })
      .filter((tab): tab is OptionsTabTarget => tab !== null)
  },
  updateTab: async (tabId, url) => {
    await getBrowser().tabs.update(tabId, {
      url,
      active: true
    })
  },
  focusWindow: async (windowId) => {
    await getBrowser().windows.update(windowId, {
      focused: true
    })
  },
  createTab: async (url) => {
    await getBrowser().tabs.create({ url })
  },
  getExtensionUrl
}

const DEFAULT_NOTIFY_SUPPORTED_SOURCE_TABS_OF_CONTENT_SETTINGS_CHANGE_DEPENDENCIES: NotifySupportedSourceTabsOfContentSettingsChangeDependencies =
  {
    queryTabs: async () => getBrowser().tabs.query({}),
    sendMessageToTab: async (tabId, message) => {
      await getBrowser().tabs.sendMessage(tabId, message)
    }
  }

export async function buildPopupState(
  dependencies: BuildPopupStateDependencies = DEFAULT_BUILD_POPUP_STATE_DEPENDENCIES
): Promise<PopupStateViewModel> {
  const sourceConfig = await dependencies.getSourceConfig()
  const downloaderConfig = await dependencies.getDownloaderConfig()
  const activeTab = await dependencies.getActiveTabContext()
  const activeSourceId = resolveActiveSourceId(activeTab.url)
  const activeTabEnabled = activeSourceId ? resolveSourceEnabled(activeSourceId, sourceConfig) : false
  const activeTabBatchRunning =
    typeof activeTab.id === "number" ? dependencies.isBatchRunningInTab(activeTab.id) : false
  const currentDownloader = getDownloaderMeta(downloaderConfig.activeId)

  return {
    downloaderConnectionStatus: resolvePopupDownloaderConnectionStatus(
      activeSourceId !== null,
      activeTabEnabled
    ),
    currentDownloaderId: currentDownloader.id,
    currentDownloaderName: currentDownloader.displayName,
    activeTab: {
      url: activeTab.url,
      sourceId: activeSourceId,
      supported: activeSourceId !== null,
      enabled: activeTabEnabled,
      batchRunning: activeTabBatchRunning
    },
    supportedSites: POPUP_SUPPORTED_SITE_IDS.map((sourceId) => {
      const siteMeta = getLocalizedSiteConfigMeta(sourceId)
      return {
        id: sourceId,
        label: siteMeta.navLabel,
        displayName: siteMeta.displayName,
        url: siteMeta.url,
        enabled: resolveSourceEnabled(sourceId, sourceConfig)
      }
    }),
    version: dependencies.getExtensionVersion(),
    helpUrl: POPUP_HELP_URL
  }
}

export async function setSourceEnabledForPopup(
  sourceId: SourceId,
  enabled: boolean,
  dependencies: SetSourceEnabledDependencies = DEFAULT_SET_SOURCE_ENABLED_DEPENDENCIES
): Promise<SourceConfig> {
  const config = await dependencies.getSourceConfig()
  return dependencies.saveSourceConfig({
    ...config,
    [sourceId]: {
      ...config[sourceId],
      enabled
    }
  })
}

export async function notifySupportedSourceTabsOfContentSettingsChange(
  dependencies: NotifySupportedSourceTabsOfContentSettingsChangeDependencies = DEFAULT_NOTIFY_SUPPORTED_SOURCE_TABS_OF_CONTENT_SETTINGS_CHANGE_DEPENDENCIES
) {
  await notifySupportedSourceTabs(
    {
      type: CONTENT_SETTINGS_CHANGED_EVENT
    },
    dependencies
  )
}

async function notifySupportedSourceTabs(
  message: ContentSettingsChangedMessage,
  dependencies: NotifySupportedSourceTabsOfContentSettingsChangeDependencies
) {
  const tabs = await dependencies.queryTabs()

  await Promise.all(
    tabs.map(async (tab) => {
      if (typeof tab.id !== "number" || typeof tab.url !== "string") {
        return
      }

      try {
        const matchedSource = getSourceAdapterForPage(new URL(tab.url))
        if (!matchedSource) {
          return
        }

        await dependencies.sendMessageToTab(tab.id, message)
      } catch {
        // Ignore unsupported tabs, malformed URLs, and tabs without an active content-script receiver.
      }
    })
  )
}

export function normalizePopupOptionsRoute(route: string | null | undefined): OptionsRoutePath {
  return isOptionsRoutePath(route) ? route : DEFAULT_OPTIONS_ROUTE
}

export async function openOptionsPageForRoute(
  route: OptionsRoutePath,
  dependencies: OpenOptionsPageDependencies = DEFAULT_OPEN_OPTIONS_PAGE_DEPENDENCIES
) {
  const optionsUrl = dependencies.getExtensionUrl(`options.html#${route}`)
  const [existingTab] = await dependencies.queryOptionsTabs()

  if (existingTab) {
    await dependencies.updateTab(existingTab.tabId, optionsUrl)
    if (typeof existingTab.windowId === "number") {
      await dependencies.focusWindow(existingTab.windowId)
    }
    return
  }

  await dependencies.createTab(optionsUrl)
}

export async function openOptionsPageAtTarget(
  target: string,
  dependencies: OpenOptionsPageDependencies = DEFAULT_OPEN_OPTIONS_PAGE_DEPENDENCIES
) {
  const optionsUrl = dependencies.getExtensionUrl(`options.html#${target}`)
  const [existingTab] = await dependencies.queryOptionsTabs()

  if (existingTab) {
    await dependencies.updateTab(existingTab.tabId, optionsUrl)
    if (typeof existingTab.windowId === "number") {
      await dependencies.focusWindow(existingTab.windowId)
    }
    return
  }

  await dependencies.createTab(optionsUrl)
}

export async function queryActiveTabUrl(): Promise<string | null> {
  const activeTab = await queryActiveTabContext()
  return activeTab.url
}

export async function queryActiveTabId(): Promise<number | null> {
  const activeTab = await queryActiveTabContext()
  return activeTab.id
}

export async function queryActiveTabContext(): Promise<{ id: number | null; url: string | null }> {
  const [activeTab] = await getBrowser().tabs.query({
    active: true,
    lastFocusedWindow: true
  })

  return {
    id: typeof activeTab?.id === "number" ? activeTab.id : null,
    url: typeof activeTab?.url === "string" ? activeTab.url : null
  }
}

function resolveActiveSourceId(url: string | null): SourceId | null {
  if (!url) {
    return null
  }

  try {
    const matchedSource = getSourceAdapterForPage(new URL(url))
    return matchedSource?.id ?? null
  } catch {
    return null
  }
}

function resolvePopupDownloaderConnectionStatus(
  activeTabSupported: boolean,
  activeTabEnabled: boolean
): PopupDownloaderConnectionStatus {
  if (activeTabSupported && activeTabEnabled) {
    return "checking"
  }

  return "idle"
}
