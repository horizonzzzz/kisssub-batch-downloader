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
      label: "保留" | "拦截"
      summary: string
      subgroup: string
      matchedFilterName: string | null
    }

export const SOURCE_OPTIONS: Array<{
  value: FilterWorkbenchSourceId
  label: string
}> = [
  { value: "kisssub", label: "Kisssub" },
  { value: "dongmanhuayuan", label: "Dongmanhuayuan" },
  { value: "acgrip", label: "ACG.RIP" },
  { value: "bangumimoe", label: "Bangumi.moe" }
]

export const MUST_CONDITION_FIELD_OPTIONS: Array<{
  value: FilterWorkbenchCondition["field"]
  label: string
}> = [
  { value: "title", label: "标题" },
  { value: "subgroup", label: "字幕组" },
  { value: "source", label: "站点" }
]

export const ANY_CONDITION_FIELD_OPTIONS: Array<{
  value: Extract<FilterWorkbenchCondition["field"], "title" | "subgroup">
  label: string
}> = [
  { value: "title", label: "标题" },
  { value: "subgroup", label: "字幕组" }
]

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
    return `站点是 ${getSourceLabel(condition.value)}`
  }

  return `${getConditionFieldLabel(condition.field)}包含“${condition.value || "..."}”`
}

export function summarizeConditionList(conditions: FilterWorkbenchCondition[]) {
  if (!conditions.length) {
    return "未设置。"
  }

  return conditions.map(summarizeCondition).join("；")
}

export function getConditionFieldLabel(
  field: FilterWorkbenchCondition["field"]
) {
  return MUST_CONDITION_FIELD_OPTIONS.find((item) => item.value === field)?.label ?? field
}

export function getSourceLabel(source: FilterWorkbenchSourceId) {
  return SOURCE_OPTIONS.find((item) => item.value === source)?.label ?? source
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
      summary: "请输入资源标题后再测试。",
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
      label: "保留",
      summary: decision.matchedFilter
        ? `命中筛选器「${decision.matchedFilter.name}」，该资源会被保留。`
        : "当前没有启用筛选器，该资源会直接保留。",
      subgroup: decision.subgroup,
      matchedFilterName: decision.matchedFilter?.name ?? null
    }
  }

  return {
    state: "result",
    accepted: false,
    label: "拦截",
    summary: "未命中任何启用中的筛选器，该资源会被拦截。",
    subgroup: decision.subgroup,
    matchedFilterName: null
  }
}
