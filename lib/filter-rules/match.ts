import type {
  FilterCondition,
  FilterEntry,
  SourceId
} from "../shared/types"
import { extractSubgroup } from "./subgroup"

export type EffectiveFilterSummaryItem = {
  id: string
  name: string
}

export type EffectiveFilterSummary = {
  effectiveCount: number
  hasEnabledFilters: boolean
  emptyStateReason: "no-enabled-filters" | "no-filters-for-source" | null
  filters: EffectiveFilterSummaryItem[]
}

export type FilterMatchContext = {
  sourceId: SourceId
  title: string
  subgroup: string
}

export type ConditionMatchResult = {
  matched: boolean
}

export type FilterMatchResult = {
  matched: boolean
}

export type FilterDecision = {
  accepted: boolean
  matchedFilter: FilterEntry | null
  message: string
  subgroup: string
  trace: string[]
}

export function deriveEffectiveFilterSummary(input: {
  sourceId: SourceId
  filters: FilterEntry[]
}): EffectiveFilterSummary {
  const enabledFilters = input.filters.filter((filter) => filter.enabled)
  const filters = enabledFilters
    .filter((filter) => isFilterEffectiveForSource(filter, input.sourceId))
    .map((filter) => ({
      id: filter.id,
      name: filter.name
    }))

  return {
    effectiveCount: filters.length,
    hasEnabledFilters: enabledFilters.length > 0,
    emptyStateReason:
      filters.length > 0
        ? null
        : enabledFilters.length > 0
          ? "no-filters-for-source"
          : "no-enabled-filters",
    filters
  }
}

export function decideFilterAction(input: {
  sourceId: SourceId
  title: string
  subgroup?: string
  filters: FilterEntry[]
}): FilterDecision {
  const subgroup = input.subgroup?.trim() || extractSubgroup(input.sourceId, input.title)
  const context: FilterMatchContext = {
    sourceId: input.sourceId,
    title: input.title,
    subgroup
  }
  const trace: string[] = []
  const enabledFilters = input.filters.filter((filter) => filter.enabled)

  if (!enabledFilters.length) {
    trace.push("未检测到启用的筛选器。")
    trace.push("未启用任何筛选器，默认放行。")

    return {
      accepted: true,
      matchedFilter: null,
      message: "No enabled filters. Accepted by default.",
      subgroup,
      trace
    }
  }

  trace.push(`共检测到 ${enabledFilters.length} 条已启用筛选器。`)

  for (const filter of enabledFilters) {
    trace.push(`检查筛选器「${filter.name}」。`)

    const result = matchesFilter(filter, context)
    if (!result.matched) {
      trace.push(`未命中筛选器「${filter.name}」。`)
      continue
    }

    trace.push(`命中筛选器「${filter.name}」，资源将被保留。`)

    return {
      accepted: true,
      matchedFilter: filter,
      message: `Matched filter: ${filter.name}`,
      subgroup,
      trace
    }
  }

  trace.push("未命中任何筛选器，按当前筛选配置拦截。")

  return {
    accepted: false,
    matchedFilter: null,
    message: "Blocked by filters: no filter matched",
    subgroup,
    trace
  }
}

export function matchesFilter(
  filter: FilterEntry,
  context: FilterMatchContext
): FilterMatchResult {
  const mustMatched = filter.must.every((condition) =>
    matchesCondition(condition, context).matched
  )
  if (!mustMatched) {
    return { matched: false }
  }

  if (!filter.any.length) {
    return { matched: true }
  }

  return {
    matched: filter.any.some((condition) => matchesCondition(condition, context).matched)
  }
}

export function matchesCondition(
  condition: FilterCondition,
  context: FilterMatchContext
): ConditionMatchResult {
  const targetValue = getConditionTargetValue(condition.field, context)

  if (condition.operator === "is") {
    return {
      matched: targetValue.toLowerCase() === condition.value.toLowerCase()
    }
  }

  return {
    matched: targetValue.toLowerCase().includes(condition.value.toLowerCase())
  }
}

function isFilterEffectiveForSource(filter: FilterEntry, sourceId: SourceId) {
  const sourceMustConditions = filter.must.filter(
    (condition): condition is Extract<FilterCondition, { field: "source" }> =>
      condition.field === "source"
  )

  if (!sourceMustConditions.length) {
    return true
  }

  return sourceMustConditions.every((condition) => condition.value === sourceId)
}

function getConditionTargetValue(
  field: FilterCondition["field"],
  context: FilterMatchContext
): string {
  if (field === "source") {
    return context.sourceId
  }

  if (field === "subgroup") {
    return context.subgroup
  }

  return context.title
}
