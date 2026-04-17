import {
  buildPopupState,
  deleteSubscriptionDefinition,
  createBatchDownloadManager,
  downloadSubscriptionHits,
  executeSubscriptionScan,
  fetchTorrentForUpload,
  notifySupportedSourceTabsOfFilterChange,
  notifyActiveTabOfSourceEnabledChange,
  openOptionsPageForRoute,
  reconcileSubscriptionAlarm,
  retryFailedItems,
  testDownloaderConnection,
  setSourceEnabledForPopup,
  upsertSubscriptionDefinition
} from "../../lib/background"
import { getDownloaderAdapter } from "../../lib/downloader"
import { ensureDownloaderPermission } from "../../lib/downloader/permissions"
import {
  clearHistory,
  deleteHistoryRecord,
  getHistoryRecord,
  getHistoryRecords,
  updateHistoryRecord
} from "../../lib/history/storage"
import { ensureSettings, getSettings, saveSettings } from "../../lib/settings"
import { SOURCE_IDS } from "../../lib/sources/catalog"
import {
  BATCH_EVENT,
  createRuntimeErrorResponse,
  createRuntimeSuccessResponse,
  type RuntimeRequest
} from "../../lib/shared/messages"
import { i18n } from "../../lib/i18n"
import { isOptionsRoutePath } from "../../lib/shared/options-routes"
import { getBrowser } from "../../lib/shared/browser"
import type { AppSettings, SourceId } from "../../lib/shared/types"
import type { BatchEventPayload } from "../../lib/shared/types"
import { extractSingleItem } from "../../lib/sources/extraction"
import { getSourceAdapterForPage } from "../../lib/sources"
import {
  parseSubscriptionNotificationRoundId,
  SUBSCRIPTION_ALARM_NAME
} from "../../lib/subscriptions"

import iconColor from "../../assets/icon.png"
import iconGrayscale from "../../assets/icon-grayscale.png"

const batchDownloadManager = createBatchDownloadManager({
  saveSettings,
  extractSingleItem,
  sendBatchEvent,
  ensureDownloaderPermission,
  getDownloader: (settings) => getDownloaderAdapter(settings.currentDownloaderId)
})

let runtimeRegistered = false

export function resolveIsSupportedSite(url: string | null | undefined): boolean {
  if (!url) return false
  if (url.startsWith("chrome://") || url.startsWith("chrome-extension://")) return false
  try {
    return getSourceAdapterForPage(new URL(url)) !== null
  } catch {
    return false
  }
}

export function updateIconForTab(tabId: number, url: string | null | undefined): void {
  const isSupported = resolveIsSupportedSite(url)
  const iconPath = isSupported ? iconColor : iconGrayscale

  getBrowser().action.setIcon({ tabId, path: iconPath }).catch(() => {
    // Tab may have been closed, ignore error.
  })
}

export function registerBackgroundRuntime() {
  if (runtimeRegistered) {
    return
  }

  const extensionBrowser = getBrowser()

  extensionBrowser.runtime.onStartup?.addListener(() => {
    void reconcileSubscriptionAlarm()
  })

  extensionBrowser.runtime.onInstalled.addListener(async () => {
    await ensureSettings()
    await reconcileSubscriptionAlarm()
    const [activeTab] = await extensionBrowser.tabs.query({ active: true, lastFocusedWindow: true })
    if (activeTab?.id) {
      updateIconForTab(activeTab.id, activeTab.url)
    }
  })

  extensionBrowser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== SUBSCRIPTION_ALARM_NAME) {
      return
    }

    void executeSubscriptionScan().catch(() => {
      // Alarm-triggered scans are best-effort and should not surface unhandled rejections.
    })
  })

  extensionBrowser.notifications.onClicked.addListener((notificationId) => {
    const roundId = parseSubscriptionNotificationRoundId(notificationId)
    if (!roundId) {
      return
    }

    void (async () => {
      const settings = await getSettings()
      if (!settings.notificationDownloadActionEnabled) {
        return
      }

      await ensureDownloaderPermission(settings, {
        interactive: true
      })
      await downloadSubscriptionHits({ roundId })
    })().catch(() => {
      // Notification click downloads are best-effort and should not crash the runtime.
    })
  })

  extensionBrowser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url !== undefined) {
      updateIconForTab(tabId, changeInfo.url)
      return
    }

    if (changeInfo.status === "complete" && tab.url) {
      updateIconForTab(tabId, tab.url)
    }
  })

  extensionBrowser.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await extensionBrowser.tabs.get(activeInfo.tabId)
    updateIconForTab(activeInfo.tabId, tab.url)
  })

  extensionBrowser.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    if (!isRuntimeMessage(message)) {
      return false
    }
    const runtimeMessage = message as RuntimeRequest

    void (async () => {
      try {
        switch (runtimeMessage.type) {
          case "GET_APP_SETTINGS":
            sendResponse(
              createRuntimeSuccessResponse("GET_APP_SETTINGS", {
                settings: await getSettings()
              })
            )
            return
          case "SAVE_APP_SETTINGS":
            const currentSettings = await getSettings()
            const savedSettings = await saveSettings(runtimeMessage.settings ?? {})
            if (didContentSyncRelevantSettingsChange(currentSettings, savedSettings)) {
              await notifySupportedSourceTabsOfFilterChange()
            }
            await reconcileSubscriptionAlarm({
              getSettings: async () => savedSettings,
              alarms: extensionBrowser.alarms
            })
            sendResponse(
              createRuntimeSuccessResponse("SAVE_APP_SETTINGS", {
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
                  getExtensionVersion: () => extensionBrowser.runtime.getManifest().version,
                  isBatchRunningInTab: (tabId) => batchDownloadManager.activeJobs.has(tabId)
                })
              })
            )
            return
          case "UPSERT_SUBSCRIPTION":
            await upsertSubscriptionDefinition(runtimeMessage.subscription)
            sendResponse(createRuntimeSuccessResponse("UPSERT_SUBSCRIPTION", {}))
            return
          case "DELETE_SUBSCRIPTION":
            await deleteSubscriptionDefinition(runtimeMessage.subscriptionId)
            sendResponse(createRuntimeSuccessResponse("DELETE_SUBSCRIPTION", {}))
            return
          case "SET_SOURCE_ENABLED":
            if (!isValidPopupSourceTogglePayload(message)) {
              sendResponse(createRuntimeErrorResponse("Invalid SET_SOURCE_ENABLED payload"))
              return
            }

            if (!message.enabled && (await hasRunningBatchForSource(message.sourceId))) {
              sendResponse(
                createRuntimeErrorResponse(i18n.t("popup.container.disableBlockedWhileRunning"))
              )
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
              await extensionBrowser.runtime.openOptionsPage()
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
                  ensureDownloaderPermission,
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

  runtimeRegistered = true
}

async function sendBatchEvent(tabId: number, payload: BatchEventPayload) {
  try {
    await getBrowser().tabs.sendMessage(tabId, {
      type: BATCH_EVENT,
      ...payload
    })
  } catch {
    // Ignore tabs that navigated away or were closed.
  }
}

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
  const [activeTab] = await getBrowser().tabs.query({
    active: true,
    lastFocusedWindow: true
  })

  return {
    id: typeof activeTab?.id === "number" ? activeTab.id : null,
    url: typeof activeTab?.url === "string" ? activeTab.url : null
  }
}

function didContentSyncRelevantSettingsChange(
  previousSettings: Pick<AppSettings, "enabledSources" | "filters">,
  nextSettings: Pick<AppSettings, "enabledSources" | "filters">
): boolean {
  return JSON.stringify(previousSettings.enabledSources) !== JSON.stringify(nextSettings.enabledSources) ||
    JSON.stringify(previousSettings.filters) !== JSON.stringify(nextSettings.filters)
}

async function hasRunningBatchForSource(sourceId: SourceId): Promise<boolean> {
  for (const tabId of batchDownloadManager.activeJobs.keys()) {
    try {
      const tab = await getBrowser().tabs.get(tabId)
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
