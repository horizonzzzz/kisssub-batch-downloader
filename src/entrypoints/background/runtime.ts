import {
  buildPopupState,
  clearPendingSubscriptionNotifications,
  createSubscriptionCommand,
  deleteSubscriptionDefinition,
  createBatchDownloadManager,
  downloadSubscriptionHits,
  downloadSubscriptionHitsBySelection,
  executeSubscriptionScan,
  fetchTorrentForUpload,
  notifySupportedSourceTabsOfContentSettingsChange,
  openOptionsPageForRoute,
  openOptionsPageAtTarget,
  reconcileSubscriptionAlarm,
  retryFailedItems,
  saveGeneralSettings,
  testDownloaderConnection,
  setSubscriptionEnabledCommand,
  setSourceEnabledForPopup
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
import {
  ensureFilterConfig,
  getFilterConfig,
  saveFilterConfig
} from "../../lib/filter-rules"
import {
  getSourceConfig,
  saveSourceConfig
} from "../../lib/sources/config"
import {
  getDownloaderConfig,
  saveDownloaderConfig
} from "../../lib/downloader/config/storage"
import { getDownloaderValidationState } from "../../lib/downloader/validation"
import { getHistoryPageContext } from "../../lib/background/queries/history-context"
import { buildContentScriptState } from "../../lib/background/queries/content-script-state"
import { SOURCE_IDS } from "../../lib/sources/catalog"
import {
  getBatchExecutionConfig,
  saveBatchExecutionConfig
} from "../../lib/batch-config/storage"
import {
  getBatchUiPreferences,
  saveBatchUiPreferences
} from "../../lib/batch-preferences/storage"
import {
  BATCH_EVENT,
  createRuntimeErrorResponse,
  createRuntimeSuccessResponse,
  type RuntimeRequest
} from "../../lib/shared/messages"
import { i18n } from "../../lib/i18n"
import { isOptionsRoutePath } from "../../lib/shared/options-routes"
import { getBrowser } from "../../lib/shared/browser"
import type {
  BatchEventPayload,
  CreateSubscriptionInput,
  SourceId
} from "../../lib/shared/types"
import { extractSingleItem } from "../../lib/sources/extraction"
import { getSourceAdapterForPage } from "../../lib/sources"
import {
  parseSubscriptionNotificationRoundId,
  SUBSCRIPTION_ALARM_NAME,
  getSubscriptionPolicyConfig,
  saveSubscriptionPolicyConfig,
  type SubscriptionPolicyConfig
} from "../../lib/subscriptions"

import iconColor from "../../assets/icon.png"
import iconGrayscale from "../../assets/icon-grayscale.png"

const batchDownloadManager = createBatchDownloadManager({
  saveBatchUiPreferences,
  extractSingleItem,
  sendBatchEvent,
  ensureDownloaderPermission: (config) => ensureDownloaderPermission(config),
  getDownloader: (config) => getDownloaderAdapter(config.activeId)
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

    void executeSubscriptionScan().catch((error) => {
      console.warn("Subscription alarm scan failed.", error)
    })
  })

  extensionBrowser.notifications.onClicked.addListener((notificationId) => {
    const roundId = parseSubscriptionNotificationRoundId(notificationId)
    if (!roundId) {
      return
    }

    void openOptionsPageAtTarget(
      `/subscription-hits?round=${encodeURIComponent(roundId)}`
    ).catch((error) => {
      console.warn("Subscription notification click navigation failed.", error)
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
          case "GET_FILTER_CONFIG":
            sendResponse(
              createRuntimeSuccessResponse("GET_FILTER_CONFIG", {
                config: await getFilterConfig()
              })
            )
            return
          case "SAVE_FILTER_CONFIG":
            const savedFilterConfig = await saveFilterConfig(runtimeMessage.config)
            await notifySupportedSourceTabsOfContentSettingsChange()
            sendResponse(
              createRuntimeSuccessResponse("SAVE_FILTER_CONFIG", {
                config: savedFilterConfig
              })
            )
            return
          case "GET_SOURCE_CONFIG":
            sendResponse(
              createRuntimeSuccessResponse("GET_SOURCE_CONFIG", {
                config: await getSourceConfig()
              })
            )
            return
          case "SAVE_SOURCE_CONFIG":
            const savedSourceConfig = await saveSourceConfig(runtimeMessage.config)
            await notifySupportedSourceTabsOfContentSettingsChange()
            sendResponse(
              createRuntimeSuccessResponse("SAVE_SOURCE_CONFIG", {
                config: savedSourceConfig
              })
            )
            return
          case "GET_DOWNLOADER_CONFIG":
            sendResponse(
              createRuntimeSuccessResponse("GET_DOWNLOADER_CONFIG", {
                config: await getDownloaderConfig()
              })
            )
            return
          case "GET_DOWNLOADER_VALIDATION_STATE":
            sendResponse(
              createRuntimeSuccessResponse("GET_DOWNLOADER_VALIDATION_STATE", {
                state: await getDownloaderValidationState()
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
          case "SAVE_DOWNLOADER_CONFIG":
            const savedDownloaderConfig = await saveDownloaderConfig(runtimeMessage.config)
            sendResponse(
              createRuntimeSuccessResponse("SAVE_DOWNLOADER_CONFIG", {
                config: savedDownloaderConfig
              })
            )
            return
          case "SAVE_GENERAL_SETTINGS":
            const savedGeneralSettings = await saveGeneralSettings({
              downloaderConfig: runtimeMessage.downloaderConfig,
              batchExecutionConfig: runtimeMessage.batchExecutionConfig
            })
            sendResponse(
              createRuntimeSuccessResponse("SAVE_GENERAL_SETTINGS", {
                downloaderConfig: savedGeneralSettings.downloaderConfig,
                batchExecutionConfig: savedGeneralSettings.batchExecutionConfig,
                validation: savedGeneralSettings.validation
              })
            )
            return
          case "GET_HISTORY_PAGE_CONTEXT":
            sendResponse(
              createRuntimeSuccessResponse("GET_HISTORY_PAGE_CONTEXT", {
                context: await getHistoryPageContext()
              })
            )
            return
          case "GET_BATCH_EXECUTION_CONFIG":
            sendResponse(
              createRuntimeSuccessResponse("GET_BATCH_EXECUTION_CONFIG", {
                config: await getBatchExecutionConfig()
              })
            )
            return
          case "SAVE_BATCH_EXECUTION_CONFIG":
            const savedBatchExecutionConfig = await saveBatchExecutionConfig(runtimeMessage.config)
            sendResponse(
              createRuntimeSuccessResponse("SAVE_BATCH_EXECUTION_CONFIG", {
                config: savedBatchExecutionConfig
              })
            )
            return
          case "GET_BATCH_UI_PREFERENCES":
            sendResponse(
              createRuntimeSuccessResponse("GET_BATCH_UI_PREFERENCES", {
                preferences: await getBatchUiPreferences()
              })
            )
            return
          case "SAVE_BATCH_UI_PREFERENCES":
            const savedBatchUiPreferences = await saveBatchUiPreferences(runtimeMessage.preferences)
            sendResponse(
              createRuntimeSuccessResponse("SAVE_BATCH_UI_PREFERENCES", {
                preferences: savedBatchUiPreferences
              })
            )
            return
          case "GET_CONTENT_SCRIPT_STATE":
            if (!isValidSourceId(runtimeMessage.sourceId)) {
              sendResponse(createRuntimeErrorResponse("Invalid sourceId for GET_CONTENT_SCRIPT_STATE"))
              return
            }
            sendResponse(
              createRuntimeSuccessResponse("GET_CONTENT_SCRIPT_STATE", {
                state: await buildContentScriptState({
                  sourceId: runtimeMessage.sourceId
                })
              })
            )
            return
          case "GET_POPUP_STATE":
            sendResponse(
              createRuntimeSuccessResponse("GET_POPUP_STATE", {
                state: await buildPopupState({
                  getSourceConfig,
                  getDownloaderConfig,
                  getActiveTabContext: queryCurrentActiveTabContext,
                  getExtensionVersion: () => extensionBrowser.runtime.getManifest().version,
                  isBatchRunningInTab: (tabId) => batchDownloadManager.activeJobs.has(tabId)
                })
              })
            )
            return
          case "CREATE_SUBSCRIPTION":
            if (!isValidCreateSubscriptionPayload(runtimeMessage)) {
              sendResponse(createRuntimeErrorResponse("Invalid CREATE_SUBSCRIPTION payload"))
              return
            }

            await createSubscriptionCommand(runtimeMessage.subscription)
            sendResponse(createRuntimeSuccessResponse("CREATE_SUBSCRIPTION", {}))
            return
          case "SET_SUBSCRIPTION_ENABLED":
            if (!isValidSetSubscriptionEnabledPayload(runtimeMessage)) {
              sendResponse(createRuntimeErrorResponse("Invalid SET_SUBSCRIPTION_ENABLED payload"))
              return
            }

            await setSubscriptionEnabledCommand(
              runtimeMessage.subscriptionId,
              runtimeMessage.enabled
            )
            sendResponse(createRuntimeSuccessResponse("SET_SUBSCRIPTION_ENABLED", {}))
            return
          case "DELETE_SUBSCRIPTION":
            if (!isValidDeleteSubscriptionPayload(runtimeMessage)) {
              sendResponse(createRuntimeErrorResponse("Invalid DELETE_SUBSCRIPTION payload"))
              return
            }

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

            await setSourceEnabledForPopup(message.sourceId, message.enabled)
            await notifySupportedSourceTabsOfContentSettingsChange()
            sendResponse(
              createRuntimeSuccessResponse("SET_SOURCE_ENABLED", {
                sourceId: message.sourceId,
                enabled: message.enabled
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
                  getDownloaderConfig,
                  getHistoryRecord,
                  updateHistoryRecord,
                  getDownloader: (config) => getDownloaderAdapter(config.activeId),
                  ensureDownloaderPermission: (config) => ensureDownloaderPermission(config),
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
          case "GET_SUBSCRIPTION_POLICY": {
            const config = await getSubscriptionPolicyConfig()
            sendResponse(createRuntimeSuccessResponse("GET_SUBSCRIPTION_POLICY", { config }))
            return
          }
          case "SAVE_SUBSCRIPTION_POLICY": {
            const previousPolicy = await getSubscriptionPolicyConfig()
            const savedConfig = await saveSubscriptionPolicyConfig(runtimeMessage.config)
            await reconcileSubscriptionAlarm({
              getSubscriptionPolicy: async () => savedConfig,
              alarms: extensionBrowser.alarms
            })
            if (didDisableSubscriptionNotificationEntryPoints(previousPolicy, savedConfig)) {
              await clearPendingSubscriptionNotifications({
                clearBrowserNotification: (notificationId) =>
                  extensionBrowser.notifications.clear(notificationId)
              })
            }
            sendResponse(createRuntimeSuccessResponse("SAVE_SUBSCRIPTION_POLICY", { config: savedConfig }))
            return
          }
          case "DOWNLOAD_SUBSCRIPTION_HITS": {
            if (!isValidDownloadSubscriptionHitsPayload(runtimeMessage)) {
              sendResponse(createRuntimeErrorResponse("Invalid DOWNLOAD_SUBSCRIPTION_HITS payload"))
              return
            }

            const result = await downloadSubscriptionHitsBySelection({
              hitIds: runtimeMessage.hitIds,
              roundId: runtimeMessage.roundId ?? null
            })
            sendResponse(createRuntimeSuccessResponse("DOWNLOAD_SUBSCRIPTION_HITS", { result }))
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

function isValidCreateSubscriptionPayload(message: {
  [key: string]: unknown
}): message is {
  subscription: CreateSubscriptionInput
} {
  const subscription = message.subscription
  if (!isPlainObject(subscription)) {
    return false
  }

  const advanced = subscription.advanced

  return isNonEmptyString(subscription.name) &&
    typeof subscription.enabled === "boolean" &&
    typeof (subscription as { id?: unknown }).id === "undefined" &&
    typeof (subscription as { createdAt?: unknown }).createdAt === "undefined" &&
    typeof (subscription as { baselineCreatedAt?: unknown }).baselineCreatedAt === "undefined" &&
    typeof (subscription as { deletedAt?: unknown }).deletedAt === "undefined" &&
    Array.isArray(subscription.sourceIds) &&
    subscription.sourceIds.length > 0 &&
    subscription.sourceIds.every((sourceId) => isValidSourceId(sourceId)) &&
    typeof subscription.multiSiteModeEnabled === "boolean" &&
    typeof subscription.titleQuery === "string" &&
    typeof subscription.subgroupQuery === "string" &&
    isPlainObject(advanced) &&
    Array.isArray(advanced.must) &&
    Array.isArray(advanced.any) &&
    advanced.must.every((condition) => isValidFilterConditionShape(condition)) &&
    advanced.any.every((condition) => isValidFilterConditionShape(condition))
}

function isValidSetSubscriptionEnabledPayload(message: {
  [key: string]: unknown
}): message is {
  subscriptionId: string
  enabled: boolean
} {
  return isNonEmptyString(message.subscriptionId) && typeof message.enabled === "boolean"
}

function isValidDeleteSubscriptionPayload(message: {
  [key: string]: unknown
}): message is {
  subscriptionId: string
} {
  return isNonEmptyString(message.subscriptionId)
}

function isValidDownloadSubscriptionHitsPayload(message: {
  [key: string]: unknown
}): message is {
  hitIds: string[]
  roundId?: string | null
} {
  return Array.isArray(message.hitIds) &&
    message.hitIds.every((hitId) => isNonEmptyString(hitId)) &&
    (typeof message.roundId === "undefined" ||
      message.roundId === null ||
      (typeof message.roundId === "string" &&
        parseSubscriptionNotificationRoundId(message.roundId) !== null))
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isValidFilterConditionShape(value: unknown): value is {
  id: string
  field: "title" | "subgroup"
  operator: "contains"
  value: string
} {
  return isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    (value.field === "title" || value.field === "subgroup") &&
    value.operator === "contains" &&
    typeof value.value === "string"
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

function didDisableSubscriptionNotificationEntryPoints(
  previousSettings: Pick<SubscriptionPolicyConfig, "enabled" | "notificationsEnabled">,
  nextSettings: Pick<SubscriptionPolicyConfig, "enabled" | "notificationsEnabled">
): boolean {
  return (previousSettings.enabled && !nextSettings.enabled) ||
    (previousSettings.notificationsEnabled && !nextSettings.notificationsEnabled)
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
