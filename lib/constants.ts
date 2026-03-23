import { DEFAULT_SOURCE_DELIVERY_MODES } from "./delivery"
import type { Settings } from "./types"

export const BATCH_EVENT = "KISSSUB_BATCH_EVENT"
export const ENTRY_SELECTOR = 'a[href*="show-"][href$=".html"]'

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  qbBaseUrl: "http://127.0.0.1:7474",
  qbUsername: "",
  qbPassword: "",
  concurrency: 1,
  injectTimeoutMs: 15000,
  domSettleMs: 1200,
  retryCount: 1,
  remoteScriptUrl: "//1.acgscript.com/script/miobt/4.js?3",
  remoteScriptRevision: "20181120.2",
  lastSavePath: "",
  sourceDeliveryModes: DEFAULT_SOURCE_DELIVERY_MODES
})
