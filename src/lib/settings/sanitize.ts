import { normalizeSourceDeliveryModes } from "../sources/delivery"
import type {
  DownloaderId,
  FilterCondition,
  FilterConditionField,
  FilterEntry,
  Settings,
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
const VALID_FILTER_CONDITION_FIELDS: FilterConditionField[] = [
  "title",
  "subgroup",
  "source"
]

export function sanitizeSettings(raw: RawSettings): Settings {
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
    filters: normalizeFilters(raw.filters ?? DEFAULT_SETTINGS.filters)
  }
}

function normalizeDownloaderId(value: unknown): DownloaderId {
  return value === "qbittorrent" || value === "transmission"
    ? value
    : DEFAULT_SETTINGS.currentDownloaderId
}

function normalizeDownloaders(raw: unknown): Settings["downloaders"] {
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

  const must = normalizeFilterConditions(record.must, {
    allowSource: true
  })
  const any = normalizeFilterConditions(record.any, {
    allowSource: false
  })
  if (!must.length) {
    return null
  }

  return {
    id: String(record.id ?? "").trim() || `filter-${fallbackIndex}`,
    name,
    enabled: record.enabled !== false,
    must,
    any
  }
}

function normalizeFilterConditions(
  raw: unknown,
  options: {
    allowSource: boolean
  }
): FilterCondition[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((entry, index) => normalizeFilterCondition(entry, index, options))
    .filter((entry): entry is FilterCondition => entry !== null)
}

function normalizeFilterCondition(
  raw: unknown,
  fallbackIndex: number,
  options: {
    allowSource: boolean
  }
): FilterCondition | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>
  const field = VALID_FILTER_CONDITION_FIELDS.includes(record.field as FilterConditionField)
    ? (record.field as FilterConditionField)
    : null
  if (!field) {
    return null
  }

  const value = String(record.value ?? "").trim()
  if (!value) {
    return null
  }

  const id = String(record.id ?? "").trim() || `condition-${fallbackIndex}`

  if (field === "source") {
    if (!options.allowSource) {
      return null
    }

    if (record.operator !== "is") {
      return null
    }

    const sourceId = value.toLowerCase() as SourceId
    if (!VALID_SOURCE_IDS.includes(sourceId)) {
      return null
    }

    return {
      id,
      field,
      operator: "is",
      value: sourceId
    }
  }

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
