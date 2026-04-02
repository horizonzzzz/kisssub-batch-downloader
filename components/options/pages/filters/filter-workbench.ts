import { decideFilterGroupAction } from "../../../../lib/filter-rules"
import type {
  FilterCondition,
  FilterConditionField,
  FilterConditionOperator,
  FilterConditionRelation,
  FilterRule,
  FilterRuleAction,
  FilterRuleGroup,
  SourceId
} from "../../../../lib/shared/types"

export type FilterWorkbenchSourceId = SourceId
export type FilterWorkbenchRuleAction = FilterRuleAction
export type FilterWorkbenchConditionField = FilterConditionField
export type FilterWorkbenchConditionOperator = FilterConditionOperator
export type FilterWorkbenchConditionRelation = FilterConditionRelation
export type FilterWorkbenchCondition = FilterCondition
export type FilterWorkbenchRule = FilterRule
export type FilterWorkbenchGroup = FilterRuleGroup

export type FilterWorkbenchGroupDraft = {
  name: string
  description: string
  enabled: boolean
}

export type FilterWorkbenchTestInput = {
  title: string
  source: FilterWorkbenchSourceId
  subgroup: string
}

export type FilterWorkbenchTestResult =
  | {
      state: "error"
      summary: string
      trace: string[]
      note: string
    }
  | {
      state: "result"
      accepted: boolean
      label: "放行" | "拦截"
      summary: string
      trace: string[]
      note: string
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

export const CONDITION_FIELD_OPTIONS: Array<{
  value: FilterWorkbenchConditionField
  label: string
}> = [
  { value: "title", label: "标题" },
  { value: "subgroup", label: "字幕组" },
  { value: "source", label: "站点" }
]

export const CONDITION_OPERATOR_OPTIONS: Array<{
  value: FilterWorkbenchConditionOperator
  label: string
}> = [
  { value: "contains", label: "包含" },
  { value: "not_contains", label: "不包含" },
  { value: "is", label: "等于" },
  { value: "is_not", label: "不等于" },
  { value: "regex", label: "正则匹配" }
]

export function getConditionFieldLabel(
  field: FilterWorkbenchConditionField
) {
  return (
    CONDITION_FIELD_OPTIONS.find((item) => item.value === field)?.label ?? field
  )
}

export function getConditionOperatorLabel(
  operator: FilterWorkbenchConditionOperator
) {
  return (
    CONDITION_OPERATOR_OPTIONS.find((item) => item.value === operator)?.label ??
    operator
  )
}

export function createWorkbenchId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function createEmptyCondition(): FilterWorkbenchCondition {
  return {
    id: createWorkbenchId("condition"),
    field: "title",
    operator: "contains",
    value: ""
  }
}

export function createEmptyRule(): FilterWorkbenchRule {
  return {
    id: createWorkbenchId("rule"),
    name: "",
    enabled: true,
    action: "exclude",
    relation: "and",
    conditions: [createEmptyCondition()]
  }
}

export function createRuleDraft(
  rule?: FilterWorkbenchRule
): FilterWorkbenchRule {
  if (!rule) {
    return createEmptyRule()
  }

  return {
    ...rule,
    conditions: rule.conditions.map((condition) => ({ ...condition }))
  }
}

export function createGroupDraft(
  group?: FilterWorkbenchGroup
): FilterWorkbenchGroupDraft {
  return {
    name: group?.name ?? "",
    description: group?.description ?? "",
    enabled: group?.enabled ?? true
  }
}

export function toWorkbenchGroup(
  draft: FilterWorkbenchGroupDraft,
  initialGroup?: FilterWorkbenchGroup
): FilterWorkbenchGroup {
  return {
    id: initialGroup?.id ?? createWorkbenchId("group"),
    name: draft.name.trim(),
    description: draft.description.trim(),
    enabled: draft.enabled,
    rules: initialGroup?.rules ?? []
  }
}

export function cloneWorkbenchRule(
  rule: FilterWorkbenchRule
): FilterWorkbenchRule {
  return {
    ...rule,
    id: createWorkbenchId("rule"),
    name: `${rule.name}（副本）`,
    conditions: rule.conditions.map((condition) => ({
      ...condition,
      id: createWorkbenchId("condition")
    }))
  }
}

export function summarizeWorkbenchRule(rule: FilterWorkbenchRule) {
  if (!rule.conditions.length) {
    return "暂无匹配条件。"
  }

  const relationLabel = rule.relation === "and" ? "且" : "或"
  const actionLabel = rule.action === "include" ? "优先放行" : "直接拦截"
  const conditionText = rule.conditions
    .map((condition) => {
      const fieldLabel = getConditionFieldLabel(condition.field)
      const operatorLabel = getConditionOperatorLabel(condition.operator)

      return `${fieldLabel}${operatorLabel}“${condition.value || "..."}”`
    })
    .join(` ${relationLabel} `)

  return `当 ${conditionText} 时，执行${actionLabel}`
}

export function createPresetGroup(): FilterWorkbenchGroup {
  return {
    id: createWorkbenchId("group"),
    name: "画质与格式过滤",
    description: "拦截明显不符合偏好的画质与格式。",
    enabled: true,
    rules: [
      {
        id: createWorkbenchId("rule"),
        name: "拦截 720p",
        enabled: true,
        action: "exclude",
        relation: "and",
        conditions: [
          {
            id: createWorkbenchId("condition"),
            field: "title",
            operator: "contains",
            value: "720p"
          }
        ]
      },
      {
        id: createWorkbenchId("rule"),
        name: "拦截 RAW",
        enabled: true,
        action: "exclude",
        relation: "and",
        conditions: [
          {
            id: createWorkbenchId("condition"),
            field: "title",
            operator: "contains",
            value: "RAW"
          }
        ]
      }
    ]
  }
}

export function runWorkbenchTest(
  input: FilterWorkbenchTestInput,
  groups: FilterWorkbenchGroup[]
): FilterWorkbenchTestResult {
  if (!input.title.trim()) {
    return {
      state: "error",
      summary: "请输入资源标题进行测试",
      trace: ["当前没有可供分析的资源标题。"],
      note: "测试台仅在输入完整资源信息后才会运行。"
    }
  }

  const decision = decideFilterGroupAction({
    sourceId: input.source,
    title: input.title,
    subgroup: input.subgroup,
    groups
  })
  const sourceLabel =
    SOURCE_OPTIONS.find((item) => item.value === input.source)?.label ??
    input.source
  const trace = [
    `测试来源站点：${sourceLabel}。`,
    decision.subgroup
      ? `参与匹配的字幕组：${decision.subgroup}。`
      : "当前未识别出字幕组信息。",
    ...decision.trace
  ]

  return {
    state: "result",
    accepted: decision.accepted,
    label: decision.accepted ? "放行" : "拦截",
    summary: decision.matchedGroup && decision.matchedRule
      ? `命中策略组「${decision.matchedGroup.name}」中的规则「${decision.matchedRule.name}」，该资源将被${
          decision.accepted ? "放行" : "拦截"
        }。`
      : "未命中任何已启用规则，该资源将按默认策略放行。",
    trace,
    note: decision.errors.length
      ? `有 ${decision.errors.length} 条条件因格式错误被当作未命中处理。`
      : "当前结果基于当前工作台中的真实策略配置。"
  }
}
