import { i18n } from "../../../../lib/i18n"
import { decideFilterAction } from "../../../../lib/filter-rules"
import type {
  FilterCondition,
  SourceId
} from "../../../../lib/shared/types"

export type FilterWorkbenchSourceId = SourceId
export type FilterWorkbenchTextCondition = Extract<
  FilterCondition,
  { field: "title" | "subgroup" }
>
export type FilterWorkbenchCondition = FilterCondition
export type FilterWorkbenchFilter = {
  id: string
  name: string
  enabled: boolean
  must: FilterWorkbenchCondition[]
  any: FilterWorkbenchTextCondition[]
}

export type FilterWorkbenchTestInput = {
  title: string
  source: FilterWorkbenchSourceId
}

export type FilterWorkbenchTestResult =
  | {
      state: "error"
      summary: string
      subgroup: string
    }
  | {
      state: "result"
      accepted: boolean
      label: string
      summary: string
      subgroup: string
      matchedFilterName: string | null
    }

export function getSourceOptions(): Array<{
  value: FilterWorkbenchSourceId
  label: string
}> {
  return [
    { value: "kisssub", label: i18n.t("options.sites.catalog.kisssub.navLabel") },
    { value: "dongmanhuayuan", label: i18n.t("options.sites.catalog.dongmanhuayuan.navLabel") },
    { value: "acgrip", label: i18n.t("options.sites.catalog.acgrip.navLabel") },
    { value: "bangumimoe", label: i18n.t("options.sites.catalog.bangumimoe.navLabel") }
  ]
}

export function getMustConditionFieldOptions(): Array<{
  value: FilterWorkbenchCondition["field"]
  label: string
}> {
  return [
    { value: "title", label: i18n.t("options.filters.field.title") },
    { value: "subgroup", label: i18n.t("options.filters.field.subgroup") },
    { value: "source", label: i18n.t("options.filters.field.source") }
  ]
}

export function getAnyConditionFieldOptions(): Array<{
  value: Extract<FilterWorkbenchCondition["field"], "title" | "subgroup">
  label: string
}> {
  return [
    { value: "title", label: i18n.t("options.filters.field.title") },
    { value: "subgroup", label: i18n.t("options.filters.field.subgroup") }
  ]
}

export function createWorkbenchId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createCondition(
  field: FilterWorkbenchCondition["field"] = "title"
): FilterWorkbenchCondition {
  if (field === "source") {
    return {
      id: createWorkbenchId("condition"),
      field: "source",
      operator: "is",
      value: "kisssub"
    }
  }

  return {
    id: createWorkbenchId("condition"),
    field,
    operator: "contains",
    value: ""
  }
}

export function createFilterDraft(
  filter?: FilterWorkbenchFilter
): FilterWorkbenchFilter {
  if (!filter) {
    return {
      id: createWorkbenchId("filter"),
      name: "",
      enabled: true,
      must: [createCondition("title")],
      any: []
    }
  }

  return {
    ...filter,
    must: filter.must.map((condition) => ({ ...condition })),
    any: filter.any.map((condition) => ({ ...condition }))
  }
}

export function createAilian1080SimplifiedChineseFilter(): FilterWorkbenchFilter {
  return {
    id: createWorkbenchId("filter"),
    name: "爱恋 1080 简中",
    enabled: true,
    must: [
      {
        id: createWorkbenchId("condition"),
        field: "subgroup",
        operator: "contains",
        value: "爱恋字幕社"
      },
      {
        id: createWorkbenchId("condition"),
        field: "title",
        operator: "contains",
        value: "1080"
      },
      {
        id: createWorkbenchId("condition"),
        field: "title",
        operator: "contains",
        value: "简中"
      }
    ],
    any: []
  }
}

export function summarizeCondition(condition: FilterWorkbenchCondition) {
  if (condition.field === "source") {
    return i18n.t("options.filters.summary.sourceIs", [getSourceLabel(condition.value)])
  }

  return i18n.t("options.filters.summary.contains", [
    getConditionFieldLabel(condition.field),
    condition.value || "..."
  ])
}

export function summarizeConditionList(conditions: FilterWorkbenchCondition[]) {
  if (!conditions.length) {
    return i18n.t("options.filters.summary.unset")
  }

  return conditions.map(summarizeCondition).join("；")
}

export function getConditionFieldLabel(
  field: FilterWorkbenchCondition["field"]
) {
  return getMustConditionFieldOptions().find((item) => item.value === field)?.label ?? field
}

export function getSourceLabel(source: FilterWorkbenchSourceId) {
  return getSourceOptions().find((item) => item.value === source)?.label ?? source
}

export function normalizeConditionField(
  field: FilterWorkbenchCondition["field"],
  condition: FilterWorkbenchCondition
): FilterWorkbenchCondition {
  if (field === "source") {
    return {
      id: condition.id,
      field: "source",
      operator: "is",
      value: "kisssub"
    }
  }

  return {
    id: condition.id,
    field,
    operator: "contains",
    value: condition.field === "source" ? "" : condition.value
  }
}

export function runWorkbenchTest(
  input: FilterWorkbenchTestInput,
  filters: FilterWorkbenchFilter[]
): FilterWorkbenchTestResult {
  if (!input.title.trim()) {
    return {
      state: "error",
      summary: i18n.t("options.filters.testBench.enterTitle"),
      subgroup: ""
    }
  }

  const decision = decideFilterAction({
    sourceId: input.source,
    title: input.title,
    filters
  })

  if (decision.accepted) {
    return {
      state: "result",
      accepted: true,
      label: i18n.t("options.filters.testBench.accepted"),
      summary: decision.matchedFilter
        ? i18n.t("options.filters.testBench.matchedFilter", [decision.matchedFilter.name])
        : i18n.t("options.filters.testBench.acceptedByDefault"),
      subgroup: decision.subgroup,
      matchedFilterName: decision.matchedFilter?.name ?? null
    }
  }

  return {
    state: "result",
    accepted: false,
    label: i18n.t("options.filters.testBench.blocked"),
    summary: i18n.t("options.filters.testBench.blockedSummary"),
    subgroup: decision.subgroup,
    matchedFilterName: null
  }
}
