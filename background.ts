import {
  buildPopupState,
  createBatchDownloadManager,
  fetchTorrentForUpload,
  notifySupportedSourceTabsOfFilterChange,
  notifyActiveTabOfSourceEnabledChange,
  openOptionsPageForRoute,
  retryFailedItems,
  testDownloaderConnection,
  setSourceEnabledForPopup
} from "./lib/background"
import { getDownloaderAdapter } from "./lib/downloader"
import {
  clearHistory,
  deleteHistoryRecord,
  getHistoryRecord,
  getHistoryRecords,
  updateHistoryRecord
} from "./lib/history/storage"
import { ensureSettings, getSettings, saveSettings } from "./lib/settings"
import { SOURCE_IDS } from "./lib/sources/catalog"
import {
  BATCH_EVENT,
  createRuntimeErrorResponse,
  createRuntimeSuccessResponse,
  type RuntimeRequest
} from "./lib/shared/messages"
import { isOptionsRoutePath } from "./lib/shared/options-routes"
import type { SourceId } from "./lib/shared/types"
import type { BatchEventPayload } from "./lib/shared/types"
import { extractSingleItem } from "./lib/sources/extraction"
import { getSourceAdapterForPage } from "./lib/sources"

// Icon assets for dynamic action icon
import iconColor from "./assets/icon.png"
import iconGrayscale from "./assets/icon-grayscale.png"

const batchDownloadManager = createBatchDownloadManager({
  saveSettings,
  extractSingleItem,
  sendBatchEvent,
  getDownloader: (settings) => getDownloaderAdapter(settings.currentDownloaderId)
})

/**
 * Resolves whether a URL belongs to a supported source site.
 * Returns false for null, empty, chrome:// URLs, or invalid URLs.
 */
export function resolveIsSupportedSite(url: string | null | undefined): boolean {
  if (!url) return false
  // Chrome internal pages are not supported
  if (url.startsWith("chrome://") || url.startsWith("chrome-extension://")) return false
  try {
    return getSourceAdapterForPage(new URL(url)) !== null
  } catch {
    return false
  }
}

/**
 * Updates the extension action icon for a specific tab.
 * Shows colored icon for supported sites, grayscale for unsupported.
 */
export function updateIconForTab(tabId: number, url: string | null | undefined): void {
  const isSupported = resolveIsSupportedSite(url)
  const iconPath = isSupported ? iconColor : iconGrayscale

  chrome.action.setIcon({ tabId, path: iconPath }).catch(() => {
    // Tab may have been closed, ignore error
  })
}

// Set initial state on install/update
chrome.runtime.onInstalled.addListener(async () => {
  await ensureSettings()
  // Set icon for currently active tab
  const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  if (activeTab?.id) {
    updateIconForTab(activeTab.id, activeTab.url)
  }
})

// Update extension icon when tab URL changes
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url !== undefined) {
    updateIconForTab(tabId, changeInfo.url)
    return
  }

  if (changeInfo.status === "complete" && tab.url) {
    updateIconForTab(tabId, tab.url)
  }
})

// Update extension icon when user switches tabs
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId)
  updateIconForTab(activeInfo.tabId, tab.url)
})

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isRuntimeMessage(message)) {
    return false
  }
  const runtimeMessage = message as RuntimeRequest

  void (async () => {
    try {
      switch (runtimeMessage.type) {
        case "GET_SETTINGS":
          sendResponse(
            createRuntimeSuccessResponse("GET_SETTINGS", {
              settings: await getSettings()
            })
          )
          return
        case "SAVE_SETTINGS":
          const savedSettings = await saveSettings(runtimeMessage.settings ?? {})
          await notifySupportedSourceTabsOfFilterChange()
          sendResponse(
            createRuntimeSuccessResponse("SAVE_SETTINGS", {
              settings: savedSettings
            })
          )
          return
        case "TEST_DOWNLOADER_CONNECTION":
          sendResponse(
            createRuntimeSuccessResponse("TEST_DOWNLOADER_CONNECTION", {
              result: await testDownloaderConnection(runtimeMessage.settings ?? null)
            })
          )
          return
        case "GET_POPUP_STATE":
          sendResponse(
            createRuntimeSuccessResponse("GET_POPUP_STATE", {
              state: await buildPopupState({
                getSettings,
                getActiveTabContext: queryCurrentActiveTabContext,
                getExtensionVersion: () => chrome.runtime.getManifest().version,
                isBatchRunningInTab: (tabId) => batchDownloadManager.activeJobs.has(tabId)
              })
            })
          )
          return
        case "SET_SOURCE_ENABLED":
          if (!isValidPopupSourceTogglePayload(message)) {
            sendResponse(createRuntimeErrorResponse("Invalid SET_SOURCE_ENABLED payload"))
            return
          }

          if (!message.enabled && (await hasRunningBatchForSource(message.sourceId))) {
            sendResponse(createRuntimeErrorResponse("当前页面正在执行批量下载，暂时不能禁用该站点。"))
            return
          }

          const settings = await setSourceEnabledForPopup(message.sourceId, message.enabled)
          await notifyActiveTabOfSourceEnabledChange(message.sourceId, message.enabled)
          sendResponse(
            createRuntimeSuccessResponse("SET_SOURCE_ENABLED", {
              settings
            })
          )
          return
        case "OPEN_OPTIONS_PAGE":
          if (typeof message.route === "undefined") {
            await chrome.runtime.openOptionsPage()
            sendResponse(createRuntimeSuccessResponse("OPEN_OPTIONS_PAGE", {}))
            return
          }

          if (!isOptionsRoutePath(message.route)) {
            sendResponse(
              createRuntimeErrorResponse(`Invalid OPEN_OPTIONS_PAGE route: ${String(message.route)}`)
            )
            return
          }

          await openOptionsPageForRoute(message.route)
          sendResponse(createRuntimeSuccessResponse("OPEN_OPTIONS_PAGE", {}))
          return
        case "START_BATCH_DOWNLOAD":
          sendResponse(
            await batchDownloadManager.startBatchDownload(
              typeof sender.tab?.id === "number" ? sender.tab.id : null,
              runtimeMessage.items ?? [],
              runtimeMessage.savePath
            )
          )
          return
        case "GET_HISTORY": {
          const records = await getHistoryRecords()
          sendResponse(createRuntimeSuccessResponse("GET_HISTORY", { records }))
          return
        }
        case "CLEAR_HISTORY": {
          await clearHistory()
          sendResponse(createRuntimeSuccessResponse("CLEAR_HISTORY", {}))
          return
        }
        case "DELETE_HISTORY_RECORD": {
          await deleteHistoryRecord(runtimeMessage.recordId)
          sendResponse(createRuntimeSuccessResponse("DELETE_HISTORY_RECORD", {}))
          return
        }
        case "RETRY_FAILED_ITEMS": {
          try {
            const result = await retryFailedItems(
              { recordId: runtimeMessage.recordId, itemIds: runtimeMessage.itemIds },
              {
                getSettings,
                getHistoryRecord,
                updateHistoryRecord,
                getDownloader: (settings) => getDownloaderAdapter(settings.currentDownloaderId),
                fetchTorrentForUpload
              }
            )
            sendResponse(
              createRuntimeSuccessResponse("RETRY_FAILED_ITEMS", {
                successCount: result.successCount,
                failedCount: result.failedCount
              })
            )
          } catch (error) {
            sendResponse(
              createRuntimeErrorResponse(error instanceof Error ? error.message : String(error))
            )
          }
          return
        }
        default:
          sendResponse(
            createRuntimeErrorResponse(
              `Unsupported message type: ${String((message as { type: string }).type)}`
            )
          )
      }
    } catch (error) {
      sendResponse(createRuntimeErrorResponse(error instanceof Error ? error.message : String(error)))
    }
  })()

  return true
})

async function sendBatchEvent(tabId: number, payload: BatchEventPayload) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: BATCH_EVENT,
      ...payload
    })
  } catch {
    // Ignore tabs that navigated away or were closed.
  }
}

export {}

function isRuntimeMessage(
  message: unknown
): message is {
  type: string
  [key: string]: unknown
} {
  return typeof message === "object" && message !== null && typeof (message as { type?: unknown }).type === "string"
}

function isValidSourceId(sourceId: unknown): sourceId is SourceId {
  return typeof sourceId === "string" && (SOURCE_IDS as readonly string[]).includes(sourceId)
}

function isValidPopupSourceTogglePayload(message: {
  [key: string]: unknown
}): message is {
  sourceId: SourceId
  enabled: boolean
} {
  return isValidSourceId(message.sourceId) && typeof message.enabled === "boolean"
}

async function queryCurrentActiveTabContext(): Promise<{ id: number | null; url: string | null }> {
  const [activeTab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  })

  return {
    id: typeof activeTab?.id === "number" ? activeTab.id : null,
    url: typeof activeTab?.url === "string" ? activeTab.url : null
  }
}

async function hasRunningBatchForSource(sourceId: SourceId): Promise<boolean> {
  for (const tabId of batchDownloadManager.activeJobs.keys()) {
    try {
      const tab = await chrome.tabs.get(tabId)
      if (resolveSourceIdFromUrl(typeof tab.url === "string" ? tab.url : null) === sourceId) {
        return true
      }
    } catch {
      // Ignore tabs that no longer exist while evaluating the guard.
    }
  }

  return false
}

function resolveSourceIdFromUrl(url: string | null): SourceId | null {
  if (!url) {
    return null
  }

  try {
    return getSourceAdapterForPage(new URL(url))?.id ?? null
  } catch {
    return null
  }
}
