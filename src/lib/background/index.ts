export { createBatchDownloadManager } from "./manager"
export { saveGeneralSettings } from "./general-settings"
export {
  buildPopupState,
  notifySupportedSourceTabsOfContentSettingsChange,
  openOptionsPageForRoute,
  openOptionsPageAtTarget,
  queryActiveTabId,
  queryActiveTabUrl,
  setSourceEnabledForPopup
} from "./popup"
export { retryFailedItems } from "./retry"
export { testDownloaderConnection } from "./service"
export {
  clearPendingSubscriptionNotifications,
  deleteSubscriptionDefinition,
  downloadSubscriptionHits,
  downloadSubscriptionHitsBySelection,
  executeSubscriptionScan,
  reconcileSubscriptionAlarm,
  replaceSubscriptionDefinitions,
  upsertSubscriptionDefinition
} from "./subscriptions"
export { fetchTorrentForUpload, getTorrentFilename } from "./torrent-file"
