import { i18n } from "../i18n"
import type { FilterConfig } from "./types"
import type { FilterEntry, FilterCondition, SourceId } from "../shared/types"

const VALID_SOURCE_IDS: SourceId[] = [
  "kisssub",
  "dongmanhuayuan",
  "acgrip",
  "bangumimoe"
]

const VALID_FILTER_CONDITION_FIELDS: Array<FilterCondition["field"]> = ["title", "subgroup"]

export function sanitizeFilterConfig(raw: unknown): FilterConfig {
  return {
    rules: normalizeFilters(raw)
  }
}

function normalizeFilters(raw: unknown): FilterEntry[] {
  if (!raw || typeof raw !== "object") {
    return []
  }

  const record = raw as Record<string, unknown>
  const rules = Array.isArray(record.rules) ? record.rules : (Array.isArray(raw) ? raw : [])

  if (!Array.isArray(rules)) {
    return []
  }

  return rules
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

export function summarizeFilterConditions(
  conditions: FilterCondition[]
): string {
  if (!conditions.length) {
    return i18n.t("options.filters.summary.unset")
  }

  return conditions
    .map((condition) =>
      i18n.t("options.filters.summary.contains", [
        getConditionFieldLabel(condition.field),
        condition.value || "..."
      ])
    )
    .join("；")
}

function getConditionFieldLabel(field: FilterCondition["field"]): string {
  return i18n.t(`options.filters.field.${field}`)
}