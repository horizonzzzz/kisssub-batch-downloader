import { i18n } from "../../lib/i18n"
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
    ? i18n.t("batch.filter.summary.enabled", [summary.effectiveCount])
    : i18n.t("batch.filter.summary.disabled")
}

function buildEmptyStateText(summary: EffectiveFilterSummary) {
  if (summary.emptyStateReason === null) {
    return null
  }

  return summary.emptyStateReason === "no-enabled-filters"
    ? i18n.t("batch.filter.emptyState.noEnabledFilters")
    : i18n.t("batch.filter.emptyState.noEffectiveFilters")
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
      : i18n.t("batch.filter.unsetSummary")
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
