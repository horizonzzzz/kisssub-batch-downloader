import { normalizeSourceDeliveryModes } from "../sources/delivery"
import type { Settings } from "../shared/types"
import { DEFAULT_SETTINGS } from "./defaults"
import { normalizeEnabledSources } from "./source-enablement"

type RawSettings = Partial<Settings> & Record<string, unknown>

export function sanitizeSettings(raw: RawSettings): Settings {
  return {
    qbBaseUrl: normalizeBaseUrl(raw.qbBaseUrl ?? DEFAULT_SETTINGS.qbBaseUrl),
    qbUsername: String(raw.qbUsername ?? "").trim(),
    qbPassword: String(raw.qbPassword ?? ""),
    concurrency: clampInteger(raw.concurrency, 1, 5, DEFAULT_SETTINGS.concurrency),
    injectTimeoutMs: clampInteger(raw.injectTimeoutMs, 3000, 60000, DEFAULT_SETTINGS.injectTimeoutMs),
    domSettleMs: clampInteger(raw.domSettleMs, 200, 10000, DEFAULT_SETTINGS.domSettleMs),
    retryCount: clampInteger(raw.retryCount, 0, 5, DEFAULT_SETTINGS.retryCount),
    remoteScriptUrl: normalizeRemoteScriptUrl(raw.remoteScriptUrl ?? DEFAULT_SETTINGS.remoteScriptUrl),
    remoteScriptRevision:
      String(raw.remoteScriptRevision ?? DEFAULT_SETTINGS.remoteScriptRevision).trim() ||
      DEFAULT_SETTINGS.remoteScriptRevision,
    lastSavePath: normalizeSavePath(raw.lastSavePath ?? DEFAULT_SETTINGS.lastSavePath),
    sourceDeliveryModes: normalizeSourceDeliveryModes(
      raw.sourceDeliveryModes ?? DEFAULT_SETTINGS.sourceDeliveryModes
    ),
    enabledSources: normalizeEnabledSources(raw.enabledSources ?? DEFAULT_SETTINGS.enabledSources)
  }
}

export function normalizeSavePath(path: unknown): string {
  return String(path ?? "").trim()
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number.parseInt(String(value), 10)
  if (Number.isNaN(numeric)) {
    return fallback
  }

  return Math.min(max, Math.max(min, numeric))
}

function normalizeBaseUrl(url: unknown): string {
  const normalized = String(url ?? "")
    .trim()
    .replace(/\/+$/, "")

  return normalized || DEFAULT_SETTINGS.qbBaseUrl
}

function normalizeRemoteScriptUrl(url: unknown): string {
  const normalized = String(url ?? "").trim()
  return normalized || DEFAULT_SETTINGS.remoteScriptUrl
}
