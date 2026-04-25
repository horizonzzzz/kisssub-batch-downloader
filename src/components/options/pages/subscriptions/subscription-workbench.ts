import { i18n } from "../../../../lib/i18n"
import type {
  CreateSubscriptionInput,
  FilterCondition,
  SourceId,
  SubscriptionEntry,
  SubscriptionHitRecord,
  SubscriptionRuntimeState
} from "../../../../lib/shared/types"

export type SubscriptionWorkbenchDraft = CreateSubscriptionInput
export type SubscriptionWorkbenchCondition = FilterCondition

type SubscriptionSourceOption = {
  value: SourceId
  label: string
}

const SUBSCRIPTION_SOURCE_OPTIONS: SubscriptionSourceOption[] = [
  {
    value: "acgrip",
    label: i18n.t("options.sites.catalog.acgrip.navLabel")
  },
  {
    value: "bangumimoe",
    label: i18n.t("options.sites.catalog.bangumimoe.navLabel")
  },
  {
    value: "comicat",
    label: i18n.t("options.sites.catalog.comicat.navLabel")
  },
  {
    value: "dongmanhuayuan",
    label: i18n.t("options.sites.catalog.dongmanhuayuan.navLabel")
  }
]

const DEFAULT_SOURCE_ID = SUBSCRIPTION_SOURCE_OPTIONS[0]?.value ?? "acgrip"

export function getSubscriptionSourceOptions(): SubscriptionSourceOption[] {
  return SUBSCRIPTION_SOURCE_OPTIONS.map((option) => ({ ...option }))
}

export function getSubscriptionScanSupportedSourceSummary() {
  return formatList(SUBSCRIPTION_SOURCE_OPTIONS.map((option) => option.label))
}

export function getSubscriptionConditionFieldOptions(): Array<{
  value: SubscriptionWorkbenchCondition["field"]
  label: string
}> {
  return [
    { value: "title", label: i18n.t("options.filters.field.title") },
    { value: "subgroup", label: i18n.t("options.filters.field.subgroup") }
  ]
}

export function createSubscriptionWorkbenchId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createSubscriptionCondition(
  field: SubscriptionWorkbenchCondition["field"] = "title"
): SubscriptionWorkbenchCondition {
  return {
    id: createSubscriptionWorkbenchId("subscription-condition"),
    field,
    operator: "contains",
    value: ""
  }
}

export function createSubscriptionDraft(): SubscriptionWorkbenchDraft {
  return {
    name: "",
    enabled: true,
    sourceIds: [DEFAULT_SOURCE_ID],
    multiSiteModeEnabled: false,
    titleQuery: "",
    subgroupQuery: "",
    advanced: {
      must: [],
      any: []
    }
  }
}

export function duplicateSubscriptionDraft(
  subscription: SubscriptionEntry
): SubscriptionWorkbenchDraft {
  return {
    name: subscription.name,
    enabled: subscription.enabled,
    sourceIds: [...subscription.sourceIds],
    multiSiteModeEnabled: subscription.multiSiteModeEnabled,
    titleQuery: subscription.titleQuery,
    subgroupQuery: subscription.subgroupQuery,
    advanced: {
      must: subscription.advanced.must.map((condition) => ({ ...condition })),
      any: subscription.advanced.any.map((condition) => ({ ...condition }))
    }
  }
}

export function toggleSubscriptionSourceSelection(
  sourceIds: SourceId[],
  sourceId: SourceId,
  multiSiteModeEnabled: boolean
): SourceId[] {
  if (!isEditableSourceId(sourceId)) {
    return normalizeEditableSourceIds(sourceIds)
  }

  if (!multiSiteModeEnabled) {
    return [sourceId]
  }

  const normalized = normalizeEditableSourceIds(sourceIds)
  if (normalized.includes(sourceId)) {
    if (normalized.length === 1) {
      return normalized
    }

    return normalized.filter((currentId) => currentId !== sourceId)
  }

  return [...normalized, sourceId]
}

export function normalizeSubscriptionDraft(
  draft: SubscriptionWorkbenchDraft
): CreateSubscriptionInput {
  const sourceIds = draft.multiSiteModeEnabled
    ? normalizeEditableSourceIds(draft.sourceIds)
    : [normalizeEditableSourceIds(draft.sourceIds)[0] ?? DEFAULT_SOURCE_ID]

  return {
    ...draft,
    name: draft.name.trim(),
    sourceIds,
    multiSiteModeEnabled: draft.multiSiteModeEnabled && sourceIds.length > 1,
    titleQuery: draft.titleQuery.trim(),
    subgroupQuery: draft.subgroupQuery.trim(),
    advanced: {
      must: draft.advanced.must.map(normalizeConditionValue),
      any: draft.advanced.any.map(normalizeConditionValue)
    }
  }
}

export function getSubscriptionValidationError(
  draft: SubscriptionWorkbenchDraft
): string | null {
  if (!draft.name.trim()) {
    return i18n.t("options.validation.subscriptionNameRequired")
  }

  if (!normalizeEditableSourceIds(draft.sourceIds).length) {
    return i18n.t("options.validation.subscriptionSourceRequired")
  }

  const conditions = [...draft.advanced.must, ...draft.advanced.any]
  if (conditions.some((condition) => !condition.value.trim())) {
    return i18n.t("options.subscriptions.dialog.conditionValueRequired")
  }

  const hasQuery =
    Boolean(draft.titleQuery.trim()) ||
    Boolean(draft.subgroupQuery.trim()) ||
    conditions.length > 0

  if (!hasQuery) {
    return i18n.t("options.subscriptions.dialog.queryRequired")
  }

  return null
}

export function summarizeSubscriptionSourceIds(sourceIds: SourceId[]) {
  const normalized = normalizeKnownSourceIds(sourceIds)

  if (!normalized.length) {
    return i18n.t("options.filters.summary.unset")
  }

  return formatList(normalized.map(getSourceLabel))
}

export function summarizeSubscriptionConditionList(
  conditions: SubscriptionWorkbenchCondition[]
) {
  if (!conditions.length) {
    return i18n.t("options.filters.summary.unset")
  }

  return formatList(
    conditions.map((condition) =>
      i18n.t("options.filters.summary.contains", [
        getSubscriptionConditionFieldLabel(condition.field),
        condition.value || "..."
      ])
    )
  )
}

export function getSubscriptionConditionFieldLabel(
  field: SubscriptionWorkbenchCondition["field"]
) {
  return (
    getSubscriptionConditionFieldOptions().find((option) => option.value === field)?.label ?? field
  )
}

export function formatSubscriptionDateTime(value: string | null) {
  if (!value) {
    return i18n.t("options.subscriptions.runtime.never")
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return i18n.t("options.subscriptions.runtime.unknownTime")
  }

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function summarizeSubscriptionRecentHits(recentHits: SubscriptionHitRecord[]) {
  if (!recentHits.length) {
    return i18n.t("options.subscriptions.runtime.noRecentHits")
  }

  const latestHit = [...recentHits].sort((left, right) =>
    right.discoveredAt.localeCompare(left.discoveredAt)
  )[0]
  if (!latestHit) {
    return i18n.t("options.subscriptions.runtime.noRecentHits")
  }

  if (recentHits.length === 1) {
    return i18n.t("options.subscriptions.runtime.latestHitSingle", [latestHit.title])
  }

  return i18n.t("options.subscriptions.runtime.latestHitMany", [
    latestHit.title,
    recentHits.length
  ])
}

export function getSubscriptionRuntimeSummary(
  runtimeState: SubscriptionRuntimeState | undefined
) {
  return {
    lastScanAt: formatSubscriptionDateTime(runtimeState?.lastScanAt ?? null),
    lastMatchedAt: formatSubscriptionDateTime(runtimeState?.lastMatchedAt ?? null),
    lastError:
      runtimeState?.lastError.trim() || i18n.t("options.subscriptions.runtime.noRecentError"),
    recentHits: summarizeSubscriptionRecentHits(runtimeState?.recentHits ?? [])
  }
}

export function countSubscriptionsWithRecentErrors(
  runtimeStateById: Record<string, SubscriptionRuntimeState>,
  subscriptionIds: string[]
) {
  return subscriptionIds.filter((subscriptionId) =>
    Boolean(runtimeStateById[subscriptionId]?.lastError?.trim())
  ).length
}

export function countSubscriptionsWithScans(
  runtimeStateById: Record<string, SubscriptionRuntimeState>,
  subscriptionIds: string[]
) {
  return subscriptionIds.filter((subscriptionId) =>
    Boolean(runtimeStateById[subscriptionId]?.lastScanAt)
  ).length
}

export function countRecentHits(
  runtimeStateById: Record<string, SubscriptionRuntimeState>,
  subscriptionIds: string[]
) {
  return subscriptionIds.reduce(
    (count, subscriptionId) =>
      count + (runtimeStateById[subscriptionId]?.recentHits.length ?? 0),
    0
  )
}

function normalizeKnownSourceIds(sourceIds: SourceId[]) {
  return Array.from(
    new Set(
      sourceIds.filter((sourceId): sourceId is SourceId =>
        SUBSCRIPTION_SOURCE_OPTIONS.some((option) => option.value === sourceId)
      )
    )
  )
}

function normalizeEditableSourceIds(sourceIds: SourceId[]) {
  return Array.from(
    new Set(
      sourceIds.filter((sourceId): sourceId is SourceId =>
        SUBSCRIPTION_SOURCE_OPTIONS.some((option) => option.value === sourceId)
      )
    )
  )
}

function isEditableSourceId(sourceId: SourceId) {
  return SUBSCRIPTION_SOURCE_OPTIONS.some((option) => option.value === sourceId)
}

function getSourceLabel(sourceId: SourceId) {
  return SUBSCRIPTION_SOURCE_OPTIONS.find((option) => option.value === sourceId)?.label ?? sourceId
}

function normalizeConditionValue(condition: SubscriptionWorkbenchCondition) {
  return {
    ...condition,
    value: condition.value.trim()
  }
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function formatList(items: string[]) {
  if (!items.length) {
    return ""
  }

  if (items.length === 1) {
    return items[0]
  }

  try {
    return new Intl.ListFormat(getCurrentLocale(), {
      style: "long",
      type: "conjunction"
    }).format(items)
  } catch {
    return items.join(", ")
  }
}

function getCurrentLocale() {
  const testLocale = (globalThis as typeof globalThis & { __animeBtTestLocale?: string })
    .__animeBtTestLocale
  if (typeof testLocale === "string" && testLocale.trim()) {
    return normalizeLocale(testLocale)
  }

  if (typeof navigator !== "undefined" && navigator.language) {
    return normalizeLocale(navigator.language)
  }

  return "en"
}

function normalizeLocale(locale: string) {
  return locale.replace("_", "-")
}
