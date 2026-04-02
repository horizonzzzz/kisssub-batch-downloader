export type FilterWorkbenchSourceId =
  | "kisssub"
  | "dongmanhuayuan"
  | "acgrip"
  | "bangumimoe"

export type FilterWorkbenchRuleAction = "include" | "exclude"

export type FilterWorkbenchConditionField = "title" | "subgroup" | "source"

export type FilterWorkbenchConditionOperator =
  | "contains"
  | "not_contains"
  | "is"
  | "is_not"
  | "regex"

export type FilterWorkbenchConditionRelation = "and" | "or"

export type FilterWorkbenchCondition = {
  id: string
  field: FilterWorkbenchConditionField
  operator: FilterWorkbenchConditionOperator
  value: string
}

export type FilterWorkbenchRule = {
  id: string
  name: string
  enabled: boolean
  action: FilterWorkbenchRuleAction
  relation: FilterWorkbenchConditionRelation
  conditions: FilterWorkbenchCondition[]
}

export type FilterWorkbenchGroup = {
  id: string
  name: string
  description: string
  enabled: boolean
  rules: FilterWorkbenchRule[]
}

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
    description: "拦截明显不符合偏好的画质与格式，作为原型默认样例。",
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

export function runPrototypeWorkbenchTest(
  input: FilterWorkbenchTestInput,
  groups: FilterWorkbenchGroup[]
): FilterWorkbenchTestResult {
  if (!input.title.trim()) {
    return {
      state: "error",
      summary: "请输入资源标题进行测试",
      trace: ["当前没有可供分析的资源标题。"],
      note: "原型阶段结果，仅用于界面预览。"
    }
  }

  const enabledGroups = groups.filter((group) => group.enabled)
  const enabledRules = enabledGroups.flatMap((group) =>
    group.rules.filter((rule) => rule.enabled)
  )
  const sourceLabel =
    SOURCE_OPTIONS.find((item) => item.value === input.source)?.label ??
    input.source
  const normalizedTitle = input.title.toLowerCase()
  const matchedKeywords = ["raw", "720p", ".mp4"].filter((keyword) =>
    normalizedTitle.includes(keyword)
  )
  const accepted = matchedKeywords.length === 0
  const trace: string[] = []

  if (!enabledGroups.length) {
    trace.push("当前没有已启用的策略组，本次结果按原型默认路径生成。")
  } else {
    trace.push(
      `读取到 ${enabledGroups.length} 个已启用策略组，优先参考「${enabledGroups[0].name}」。`
    )
  }

  if (!enabledRules.length) {
    trace.push("没有已启用规则可供匹配，本次仅演示结果面板。")
  } else {
    trace.push(
      `示例命中路径参考规则「${enabledRules[0].name}」，但尚未接入真实过滤引擎。`
    )
  }

  if (matchedKeywords.length) {
    trace.push(
      `标题包含原型阶段风险关键字：${matchedKeywords.join(" / ")}。`
    )
  } else {
    trace.push("标题未命中示例风险关键字：RAW / 720p / .mp4。")
  }

  if (input.subgroup.trim()) {
    trace.push(`已带入字幕组字段：${input.subgroup.trim()}。`)
  }

  trace.push(`测试来源站点：${sourceLabel}。`)

  return {
    state: "result",
    accepted,
    label: accepted ? "放行" : "拦截",
    summary: accepted
      ? "按原型演示逻辑，该资源会被视为可放行。"
      : "按原型演示逻辑，该资源会被视为需要拦截。",
    trace,
    note: "原型阶段结果，仅用于界面预览。"
  }
}
