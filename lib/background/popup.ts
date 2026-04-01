import packageJson from "../../package.json"
import { getSourceAdapterForPage } from "../sources"
import { getSettings, resolveSourceEnabled, saveSettings } from "../settings"
import { SOURCE_ENABLED_CHANGE_EVENT, type SourceEnabledChangeMessage } from "../shared/messages"
import { DEFAULT_OPTIONS_ROUTE, isOptionsRoutePath, type OptionsRoutePath } from "../shared/options-routes"
import {
  POPUP_HELP_URL,
  POPUP_SUPPORTED_SITE_IDS,
  POPUP_SUPPORTED_SITE_META,
  type PopupStateViewModel
} from "../shared/popup"
import type { Settings, SourceId } from "../shared/types"

type BuildPopupStateDependencies = {
  getSettings: () => Promise<Settings>
  getActiveTabUrl: () => Promise<string | null>
  getExtensionVersion: () => string
}

type SetSourceEnabledDependencies = {
  getSettings: () => Promise<Settings>
  saveSettings: (partialSettings: Partial<Settings>) => Promise<Settings>
}

type OpenOptionsPageDependencies = {
  queryOptionsTabIds: () => Promise<number[]>
  updateTab: (tabId: number, url: string) => Promise<void>
  createTab: (url: string) => Promise<void>
  getExtensionUrl: (path: string) => string
}

type NotifyActiveTabOfSourceEnabledChangeDependencies = {
  queryActiveTabId: () => Promise<number | null>
  sendMessageToTab: (tabId: number, message: SourceEnabledChangeMessage) => Promise<void>
}

const DEFAULT_BUILD_POPUP_STATE_DEPENDENCIES: BuildPopupStateDependencies = {
  getSettings,
  getActiveTabUrl: queryActiveTabUrl,
  getExtensionVersion: () => packageJson.version
}

const DEFAULT_SET_SOURCE_ENABLED_DEPENDENCIES: SetSourceEnabledDependencies = {
  getSettings,
  saveSettings
}

const DEFAULT_OPEN_OPTIONS_PAGE_DEPENDENCIES: OpenOptionsPageDependencies = {
  queryOptionsTabIds: async () => {
    const optionsTabs = await chrome.tabs.query({
      url: chrome.runtime.getURL("options.html*")
    })

    return optionsTabs
      .map((tab) => tab.id)
      .filter((tabId): tabId is number => typeof tabId === "number")
  },
  updateTab: async (tabId, url) => {
    await chrome.tabs.update(tabId, {
      url,
      active: true
    })
  },
  createTab: async (url) => {
    await chrome.tabs.create({ url })
  },
  getExtensionUrl: (path) => chrome.runtime.getURL(path)
}

const DEFAULT_NOTIFY_ACTIVE_TAB_OF_SOURCE_ENABLED_CHANGE_DEPENDENCIES: NotifyActiveTabOfSourceEnabledChangeDependencies =
  {
    queryActiveTabId,
    sendMessageToTab: async (tabId, message) => {
      await chrome.tabs.sendMessage(tabId, message)
    }
  }

export async function buildPopupState(
  dependencies: BuildPopupStateDependencies = DEFAULT_BUILD_POPUP_STATE_DEPENDENCIES
): Promise<PopupStateViewModel> {
  const settings = await dependencies.getSettings()
  const activeTabUrl = await dependencies.getActiveTabUrl()
  const activeSourceId = resolveActiveSourceId(activeTabUrl)

  return {
    qbConfigured: isQbConfigured(settings),
    activeTab: {
      url: activeTabUrl,
      sourceId: activeSourceId,
      supported: activeSourceId !== null,
      enabled: activeSourceId ? resolveSourceEnabled(activeSourceId, settings) : false
    },
    supportedSites: POPUP_SUPPORTED_SITE_IDS.map((sourceId) => {
      const siteMeta = POPUP_SUPPORTED_SITE_META[sourceId]
      return {
        id: sourceId,
        label: siteMeta.navLabel,
        displayName: siteMeta.displayName,
        url: siteMeta.url,
        enabled: resolveSourceEnabled(sourceId, settings)
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
): Promise<Settings> {
  const settings = await dependencies.getSettings()
  return dependencies.saveSettings({
    enabledSources: {
      ...settings.enabledSources,
      [sourceId]: enabled
    }
  })
}

export async function notifyActiveTabOfSourceEnabledChange(
  sourceId: SourceId,
  enabled: boolean,
  dependencies: NotifyActiveTabOfSourceEnabledChangeDependencies = DEFAULT_NOTIFY_ACTIVE_TAB_OF_SOURCE_ENABLED_CHANGE_DEPENDENCIES
) {
  const activeTabId = await dependencies.queryActiveTabId()
  if (typeof activeTabId !== "number") {
    return
  }

  try {
    await dependencies.sendMessageToTab(activeTabId, {
      type: SOURCE_ENABLED_CHANGE_EVENT,
      sourceId,
      enabled
    })
  } catch {
    // Ignore tabs without a receiver, such as unsupported or reloaded pages.
  }
}

export function normalizePopupOptionsRoute(route: string | null | undefined): OptionsRoutePath {
  return isOptionsRoutePath(route) ? route : DEFAULT_OPTIONS_ROUTE
}

export async function openOptionsPageForRoute(
  route: OptionsRoutePath,
  dependencies: OpenOptionsPageDependencies = DEFAULT_OPEN_OPTIONS_PAGE_DEPENDENCIES
) {
  const optionsUrl = dependencies.getExtensionUrl(`options.html#${route}`)
  const [existingTabId] = await dependencies.queryOptionsTabIds()

  if (typeof existingTabId === "number") {
    await dependencies.updateTab(existingTabId, optionsUrl)
    return
  }

  await dependencies.createTab(optionsUrl)
}

export async function queryActiveTabUrl(): Promise<string | null> {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  })

  return typeof activeTab?.url === "string" ? activeTab.url : null
}

export async function queryActiveTabId(): Promise<number | null> {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  })

  return typeof activeTab?.id === "number" ? activeTab.id : null
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

function isQbConfigured(settings: Settings): boolean {
  return Boolean(settings.qbBaseUrl.trim())
}
