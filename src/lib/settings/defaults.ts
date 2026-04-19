import { DEFAULT_SOURCE_CONFIG } from "../sources/config/defaults"
import type { AppSettings } from "../shared/types"

export const DEFAULT_SETTINGS: AppSettings = Object.freeze({
  currentDownloaderId: "qbittorrent",
  downloaders: {
    qbittorrent: {
      baseUrl: "http://127.0.0.1:7474",
      username: "",
      password: ""
    },
    transmission: {
      baseUrl: "http://127.0.0.1:9091/transmission/rpc",
      username: "",
      password: ""
    }
  },
  concurrency: 3,
  injectTimeoutMs: 15000,
  domSettleMs: 1200,
  retryCount: 3,
  remoteScriptUrl: DEFAULT_SOURCE_CONFIG.kisssub.script.url,
  remoteScriptRevision: DEFAULT_SOURCE_CONFIG.kisssub.script.revision,
  lastSavePath: "",
  sourceDeliveryModes: {
    kisssub: DEFAULT_SOURCE_CONFIG.kisssub.deliveryMode,
    dongmanhuayuan: DEFAULT_SOURCE_CONFIG.dongmanhuayuan.deliveryMode,
    acgrip: DEFAULT_SOURCE_CONFIG.acgrip.deliveryMode,
    bangumimoe: DEFAULT_SOURCE_CONFIG.bangumimoe.deliveryMode
  },
  enabledSources: {
    kisssub: DEFAULT_SOURCE_CONFIG.kisssub.enabled,
    dongmanhuayuan: DEFAULT_SOURCE_CONFIG.dongmanhuayuan.enabled,
    acgrip: DEFAULT_SOURCE_CONFIG.acgrip.enabled,
    bangumimoe: DEFAULT_SOURCE_CONFIG.bangumimoe.enabled
  },
  filters: [],
  subscriptionsEnabled: false,
  pollingIntervalMinutes: 30,
  notificationsEnabled: true,
  notificationDownloadActionEnabled: true
})

