import { normalizeSourceDeliveryModes } from "../sources/delivery"
import type {
  FilterCondition,
  FilterConditionField,
  FilterConditionOperator,
  FilterConditionRelation,
  FilterRule,
  FilterRuleAction,
  FilterRuleGroup,
  Settings,
  SourceId
} from "../shared/types"
import { DEFAULT_SETTINGS } from "./defaults"
import { normalizeEnabledSources } from "./source-enablement"

type RawSettings = Partial<Settings> & Record<string, unknown>

const VALID_SOURCE_IDS: SourceId[] = [
  "kisssub",
  "dongmanhuayuan",
  "acgrip",
  "bangumimoe"
]
const VALID_FILTER_RULE_ACTIONS: FilterRuleAction[] = ["include", "exclude"]
const VALID_FILTER_CONDITION_FIELDS: FilterConditionField[] = [
  "title",
  "subgroup",
  "source"
]
const VALID_FILTER_CONDITION_OPERATORS: FilterConditionOperator[] = [
  "contains",
  "not_contains",
  "is",
  "is_not",
  "regex"
]
const VALID_FILTER_CONDITION_RELATIONS: FilterConditionRelation[] = ["and", "or"]

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
    enabledSources: normalizeEnabledSources(raw.enabledSources ?? DEFAULT_SETTINGS.enabledSources),
    filterGroups: normalizeFilterGroups(raw.filterGroups ?? DEFAULT_SETTINGS.filterGroups)
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

function normalizeFilterGroups(raw: unknown): FilterRuleGroup[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((entry, index) => normalizeFilterGroup(entry, index))
    .filter((entry): entry is FilterRuleGroup => entry !== null)
}

function normalizeFilterGroup(raw: unknown, fallbackIndex: number): FilterRuleGroup | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>
  const name = String(record.name ?? "").trim()
  if (!name) {
    return null
  }

  return {
    id: String(record.id ?? "").trim() || `group-${fallbackIndex}`,
    name,
    description: String(record.description ?? "").trim(),
    enabled: record.enabled !== false,
    rules: normalizeFilterRules(record.rules)
  }
}

function normalizeFilterRules(raw: unknown): FilterRule[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((entry, index) => normalizeFilterRule(entry, index))
    .filter((entry): entry is FilterRule => entry !== null)
}

function normalizeFilterRule(raw: unknown, fallbackIndex: number): FilterRule | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>
  const name = String(record.name ?? "").trim()
  if (!name) {
    return null
  }

  const conditions = normalizeFilterConditions(record.conditions)
  if (!conditions.length) {
    return null
  }

  return {
    id: String(record.id ?? "").trim() || `rule-${fallbackIndex}`,
    name,
    enabled: record.enabled !== false,
    action: VALID_FILTER_RULE_ACTIONS.includes(record.action as FilterRuleAction)
      ? (record.action as FilterRuleAction)
      : "exclude",
    relation: VALID_FILTER_CONDITION_RELATIONS.includes(
      record.relation as FilterConditionRelation
    )
      ? (record.relation as FilterConditionRelation)
      : "and",
    conditions
  }
}

function normalizeFilterConditions(raw: unknown): FilterCondition[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((entry, index) => normalizeFilterCondition(entry, index))
    .filter((entry): entry is FilterCondition => entry !== null)
}

function normalizeFilterCondition(raw: unknown, fallbackIndex: number): FilterCondition | null {
  if (!raw || typeof raw !== "object") {
    return null
  }

  const record = raw as Record<string, unknown>
  const field = VALID_FILTER_CONDITION_FIELDS.includes(record.field as FilterConditionField)
    ? (record.field as FilterConditionField)
    : null
  const operator = VALID_FILTER_CONDITION_OPERATORS.includes(
    record.operator as FilterConditionOperator
  )
    ? (record.operator as FilterConditionOperator)
    : null

  if (!field || !operator) {
    return null
  }

  const value = normalizeConditionValue(field, record.value)
  if (!value) {
    return null
  }

  if (operator === "regex" && !isValidRegex(value)) {
    return null
  }

  return {
    id: String(record.id ?? "").trim() || `condition-${fallbackIndex}`,
    field,
    operator,
    value
  }
}

function normalizeConditionValue(field: FilterConditionField, raw: unknown): string | null {
  const normalized = String(raw ?? "").trim()
  if (!normalized) {
    return null
  }

  if (field === "source") {
    const sourceId = normalized.toLowerCase() as SourceId
    return VALID_SOURCE_IDS.includes(sourceId) ? sourceId : null
  }

  return normalized
}

function isValidRegex(pattern: string): boolean {
  try {
    new RegExp(pattern)
    return true
  } catch {
    return false
  }
}
