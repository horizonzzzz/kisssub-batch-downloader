import {
  deriveEffectiveFilterSummary,
  type EffectiveFilterSummary,
  type EffectiveFilterSummaryItem
} from "../../lib/filter-rules"
import type { FilterEntry, SourceId } from "../../lib/shared/types"
import { summarizeConditionList } from "../options/pages/filters/filter-workbench"
import type { BatchPanelFilterStatus } from "./types"

function buildFilterSummaryText(summary: EffectiveFilterSummary) {
  return summary.effectiveCount > 0
    ? `筛选规则：已启用 ${summary.effectiveCount} 条`
    : "筛选规则：未启用"
}

function buildEmptyStateText(summary: EffectiveFilterSummary) {
  if (summary.emptyStateReason === null) {
    return null
  }

  return summary.emptyStateReason === "no-enabled-filters"
    ? "当前站点未加载可生效的筛选规则，默认全部保留。"
    : "当前站点未加载可生效的筛选规则，默认全部保留。"
}

function createFilterStatusItem(
  filter: EffectiveFilterSummaryItem,
  allFilters: FilterEntry[]
): BatchPanelFilterStatus["filters"][number] {
  const matchedFilter = allFilters.find((entry) => entry.id === filter.id)

  return {
    id: filter.id,
    name: filter.name,
    summary: matchedFilter
      ? summarizeConditionList([...matchedFilter.must, ...matchedFilter.any])
      : "未设置。"
  }
}

export function createBatchPanelFilterStatus(input: {
  sourceId: SourceId
  filters: FilterEntry[]
}): BatchPanelFilterStatus {
  const filters = input.filters ?? []
  const summary = deriveEffectiveFilterSummary({
    sourceId: input.sourceId,
    filters
  })

  return {
    summaryText: buildFilterSummaryText(summary),
    emptyStateText: buildEmptyStateText(summary),
    filters: summary.filters.map((filter) => createFilterStatusItem(filter, filters))
  }
}
