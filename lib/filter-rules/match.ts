import type {
  FilterCondition,
  FilterRule,
  FilterRuleAction,
  FilterRuleGroup,
  SourceId
} from "../shared/types"
import { extractSubgroup } from "./subgroup"

export type FilterMatchContext = {
  sourceId: SourceId
  title: string
  subgroup: string
}

export type ConditionMatchResult = {
  matched: boolean
  error?: string
}

export type RuleMatchResult = {
  matched: boolean
  errors: string[]
}

export type FilterRuleDecision = {
  accepted: boolean
  matchedGroup: FilterRuleGroup | null
  matchedRule: FilterRule | null
  action: FilterRuleAction | null
  message: string
  subgroup: string
  trace: string[]
  errors: string[]
}

export function decideFilterGroupAction(input: {
  sourceId: SourceId
  title: string
  subgroup?: string
  groups: FilterRuleGroup[]
}): FilterRuleDecision {
  const subgroup = input.subgroup?.trim() || extractSubgroup(input.sourceId, input.title)
  const context: FilterMatchContext = {
    sourceId: input.sourceId,
    title: input.title,
    subgroup
  }
  const trace: string[] = []
  const errors: string[] = []

  for (const group of input.groups) {
    if (!group.enabled) {
      trace.push(`跳过策略组「${group.name}」：已停用。`)
      continue
    }

    trace.push(`进入策略组「${group.name}」。`)

    if (!group.rules.length) {
      trace.push(`策略组「${group.name}」下没有规则。`)
      continue
    }

    for (const rule of group.rules) {
      if (!rule.enabled) {
        trace.push(`跳过规则「${rule.name}」：已停用。`)
        continue
      }

      const result = matchesRule(rule, context)
      if (result.errors.length) {
        errors.push(...result.errors)
        trace.push(...result.errors.map((error) => `规则「${rule.name}」存在条件错误：${error}`))
      }

      if (!result.matched) {
        trace.push(`未命中规则「${rule.name}」。`)
        continue
      }

      const actionLabel = rule.action === "include" ? "优先放行" : "直接拦截"
      trace.push(`命中规则「${rule.name}」，执行${actionLabel}并停止匹配。`)

      return {
        accepted: rule.action === "include",
        matchedGroup: group,
        matchedRule: rule,
        action: rule.action,
        message: `Matched filter group: ${group.name} / ${rule.name}`,
        subgroup,
        trace,
        errors
      }
    }
  }

  trace.push("未命中任何已启用规则，按默认策略放行。")

  return {
    accepted: true,
    matchedGroup: null,
    matchedRule: null,
    action: null,
    message: "",
    subgroup,
    trace,
    errors
  }
}

export function matchesRule(
  rule: FilterRule,
  context: FilterMatchContext
): RuleMatchResult {
  const results = rule.conditions.map((condition) =>
    matchesCondition(condition, context)
  )
  const errors = results.flatMap((result) => (result.error ? [result.error] : []))
  const matched =
    rule.relation === "or"
      ? results.some((result) => result.matched)
      : results.every((result) => result.matched)

  return {
    matched,
    errors
  }
}

export function matchesCondition(
  condition: FilterCondition,
  context: FilterMatchContext
): ConditionMatchResult {
  const targetValue = getConditionTargetValue(condition.field, context)
  const normalizedTarget = targetValue.toLowerCase()
  const normalizedExpected = condition.value.toLowerCase()

  switch (condition.operator) {
    case "contains":
      return {
        matched: normalizedTarget.includes(normalizedExpected)
      }
    case "not_contains":
      return {
        matched: !normalizedTarget.includes(normalizedExpected)
      }
    case "is":
      return {
        matched: normalizedTarget === normalizedExpected
      }
    case "is_not":
      return {
        matched: normalizedTarget !== normalizedExpected
      }
    case "regex":
      try {
        return {
          matched: new RegExp(condition.value).test(targetValue)
        }
      } catch {
        return {
          matched: false,
          error: `无效正则：${condition.value}`
        }
      }
  }
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
