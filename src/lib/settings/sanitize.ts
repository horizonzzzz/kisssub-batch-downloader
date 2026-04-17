import { normalizeSourceDeliveryModes } from "../sources/delivery"
import type {
  AppSettings,
  DownloaderId,
  FilterCondition,
  FilterEntry,
  SourceId
} from "../shared/types"
import { DEFAULT_SETTINGS } from "./defaults"
import { normalizeEnabledSources } from "./source-enablement"

type RawSettings = Record<string, unknown>

const VALID_SOURCE_IDS: SourceId[] = [
  "kisssub",
  "dongmanhuayuan",
  "acgrip",
  "bangumimoe"
]
const VALID_FILTER_CONDITION_FIELDS: Array<FilterCondition["field"]> = ["title", "subgroup"]
const MIN_SUBSCRIPTION_POLLING_INTERVAL_MINUTES = 5
const MAX_SUBSCRIPTION_POLLING_INTERVAL_MINUTES = 120

export function sanitizeSettings(raw: RawSettings): AppSettings {
  return {
    currentDownloaderId: normalizeDownloaderId(
      raw.currentDownloaderId ?? DEFAULT_SETTINGS.currentDownloaderId
    ),
    downloaders: normalizeDownloaders(raw.downloaders ?? DEFAULT_SETTINGS.downloaders),
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
    enabledSources: normalizeEnabledSources(raw.enabledSources ?? DEFAULT_SETTINGS.enabledSources),
    filters: normalizeFilters(raw.filters ?? DEFAULT_SETTINGS.filters),
    subscriptionsEnabled: normalizeBoolean(
      raw.subscriptionsEnabled,
      DEFAULT_SETTINGS.subscriptionsEnabled
    ),
    pollingIntervalMinutes: clampInteger(
      raw.pollingIntervalMinutes,
      MIN_SUBSCRIPTION_POLLING_INTERVAL_MINUTES,
      MAX_SUBSCRIPTION_POLLING_INTERVAL_MINUTES,
      DEFAULT_SETTINGS.pollingIntervalMinutes
    ),
    notificationsEnabled: normalizeBoolean(
      raw.notificationsEnabled,
      DEFAULT_SETTINGS.notificationsEnabled
    ),
    notificationDownloadActionEnabled: normalizeBoolean(
      raw.notificationDownloadActionEnabled,
      DEFAULT_SETTINGS.notificationDownloadActionEnabled
    )
  }
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value
  }

  if (value === 1 || value === "1" || value === "true") {
    return true
  }

  if (value === 0 || value === "0" || value === "false") {
    return false
  }

  return fallback
}

function normalizeDownloaderId(value: unknown): DownloaderId {
  return value === "qbittorrent" || value === "transmission"
    ? value
    : DEFAULT_SETTINGS.currentDownloaderId
}

function normalizeDownloaders(raw: unknown): AppSettings["downloaders"] {
  const record = raw && typeof raw === "object"
    ? (raw as Record<string, unknown>)
    : {}
  const qbRaw =
    record.qbittorrent && typeof record.qbittorrent === "object"
      ? (record.qbittorrent as Record<string, unknown>)
      : {}
  const transmissionRaw =
    record.transmission && typeof record.transmission === "object"
      ? (record.transmission as Record<string, unknown>)
      : {}

  return {
    qbittorrent: {
      baseUrl: normalizeBaseUrl(qbRaw.baseUrl, DEFAULT_SETTINGS.downloaders.qbittorrent.baseUrl),
      username: String(qbRaw.username ?? "").trim(),
      password: String(qbRaw.password ?? "")
    },
    transmission: {
      baseUrl: normalizeBaseUrl(
        transmissionRaw.baseUrl,
        DEFAULT_SETTINGS.downloaders.transmission.baseUrl
      ),
      username: String(transmissionRaw.username ?? "").trim(),
      password: String(transmissionRaw.password ?? "")
    }
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

function normalizeBaseUrl(url: unknown, fallback: string): string {
  const normalized = String(url ?? "")
    .trim()
    .replace(/\/+$/, "")

  return normalized || fallback
}

function normalizeRemoteScriptUrl(url: unknown): string {
  const normalized = String(url ?? "").trim()
  return normalized || DEFAULT_SETTINGS.remoteScriptUrl
}

function normalizeFilters(raw: unknown): FilterEntry[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((entry, index) => normalizeFilter(entry, index))
    .filter((entry): entry is FilterEntry => entry !== null)
}

function normalizeFilter(raw: unknown, fallbackIndex: number): FilterEntry | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>
  const name = String(record.name ?? "").trim()
  if (!name) {
    return null
  }

  const must = normalizeFilterConditions(record.must)
  const any = normalizeFilterConditions(record.any)
  if (!must.length) {
    return null
  }

  return {
    id: String(record.id ?? "").trim() || `filter-${fallbackIndex}`,
    name,
    enabled: normalizeBoolean(record.enabled, true),
    sourceIds: normalizeExplicitSourceIds(record.sourceIds),
    must,
    any
  }
}

function normalizeExplicitSourceIds(raw: unknown): SourceId[] {
  if (!Array.isArray(raw)) {
    return [...VALID_SOURCE_IDS]
  }

  const normalized = raw
    .map((entry) => String(entry ?? "").trim().toLowerCase() as SourceId)
    .filter((entry): entry is SourceId => VALID_SOURCE_IDS.includes(entry))

  if (!normalized.length) {
    return [...VALID_SOURCE_IDS]
  }

  return Array.from(new Set(normalized))
}

function normalizeFilterConditions(raw: unknown): FilterCondition[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((entry, index) => normalizeFilterCondition(entry, index))
    .filter((entry): entry is FilterCondition => entry !== null)
}

function normalizeFilterCondition(
  raw: unknown,
  fallbackIndex: number
): FilterCondition | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>
  const field = VALID_FILTER_CONDITION_FIELDS.includes(record.field as FilterCondition["field"])
    ? (record.field as FilterCondition["field"])
    : null
  if (!field) {
    return null
  }

  const value = String(record.value ?? "").trim()
  if (!value) {
    return null
  }

  const id = String(record.id ?? "").trim() || `condition-${fallbackIndex}`

  if (record.operator !== "contains") {
    return null
  }

  return {
    id,
    field,
    operator: "contains",
    value
  }
}
