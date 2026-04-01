import {
  buildPopupState,
  createBatchDownloadManager,
  fetchTorrentForUpload,
  openOptionsPageForRoute,
  retryFailedItems,
  testQbConnection,
  setSourceEnabledForPopup
} from "./lib/background"
import { addTorrentFilesToQb, addUrlsToQb, loginQb } from "./lib/downloader/qb"
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
  loginQb,
  addUrlsToQb,
  addTorrentFilesToQb
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
          sendResponse(
            createRuntimeSuccessResponse("SAVE_SETTINGS", {
              settings: await saveSettings(runtimeMessage.settings ?? {})
            })
          )
          return
        case "TEST_QB_CONNECTION":
          sendResponse(
            createRuntimeSuccessResponse("TEST_QB_CONNECTION", {
              result: await testQbConnection(runtimeMessage.settings ?? null)
            })
          )
          return
        case "GET_POPUP_STATE":
          sendResponse(
            createRuntimeSuccessResponse("GET_POPUP_STATE", {
              state: await buildPopupState()
            })
          )
          return
        case "SET_SOURCE_ENABLED":
          if (!isValidPopupSourceTogglePayload(message)) {
            sendResponse(createRuntimeErrorResponse("Invalid SET_SOURCE_ENABLED payload"))
            return
          }
          sendResponse(
            createRuntimeSuccessResponse("SET_SOURCE_ENABLED", {
              settings: await setSourceEnabledForPopup(message.sourceId, message.enabled)
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
                loginQb,
                addUrlsToQb,
                fetchTorrentForUpload,
                addTorrentFilesToQb
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
