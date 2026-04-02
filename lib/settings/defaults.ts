import { DEFAULT_SOURCE_DELIVERY_MODES } from "../sources/delivery"
import type { Settings } from "../shared/types"
import { DEFAULT_ENABLED_SOURCES } from "./source-enablement"

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
  sourceDeliveryModes: DEFAULT_SOURCE_DELIVERY_MODES,
  enabledSources: DEFAULT_ENABLED_SOURCES,
  filterGroups: []
})
