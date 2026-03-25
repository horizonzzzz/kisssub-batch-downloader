import { DEFAULT_SETTINGS } from "./constants"
import { normalizeSourceDeliveryModes } from "./delivery"
import { normalizeEnabledSources } from "./source-enablement"
import type { Settings } from "./types"

type RawSettings = Partial<Settings> & Record<string, unknown>

export { DEFAULT_SETTINGS } from "./constants"

export function sanitizeSettings(raw: RawSettings): Settings {
  return {
    qbBaseUrl: normalizeBaseUrl(raw.qbBaseUrl ?? DEFAULT_SETTINGS.qbBaseUrl),
    qbUsername: String(raw.qbUsername ?? "").trim(),
    qbPassword: String(raw.qbPassword ?? ""),
    concurrency: clampInteger(raw.concurrency, 1, 3, DEFAULT_SETTINGS.concurrency),
    injectTimeoutMs: clampInteger(raw.injectTimeoutMs, 3000, 60000, DEFAULT_SETTINGS.injectTimeoutMs),
    domSettleMs: clampInteger(raw.domSettleMs, 200, 10000, DEFAULT_SETTINGS.domSettleMs),
    retryCount: clampInteger(raw.retryCount, 0, 3, DEFAULT_SETTINGS.retryCount),
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

export async function ensureSettings(): Promise<void> {
  const stored = await chrome.storage.local.get("settings")
  if (!stored.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS })
  }
}

export async function getSettings(): Promise<Settings> {
  await ensureSettings()
  const stored = await chrome.storage.local.get("settings")
  return sanitizeSettings({
    ...DEFAULT_SETTINGS,
    ...(stored.settings ?? {})
  })
}

export async function saveSettings(partialSettings: RawSettings): Promise<Settings> {
  const merged = sanitizeSettings({
    ...(await getSettings()),
    ...(partialSettings ?? {})
  })

  await chrome.storage.local.set({ settings: merged })
  return merged
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

function normalizeSavePath(path: unknown): string {
  return String(path ?? "").trim()
}
