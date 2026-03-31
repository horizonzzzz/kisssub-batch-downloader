import type { FilterRule, FilterRuleAction, SourceId } from "../shared/types"
import { extractSubgroup } from "./subgroup"

export type FilterRuleDecision = {
  accepted: boolean
  matchedRule: FilterRule | null
  action: FilterRuleAction | null
  message: string
}

export function decideFilterRuleAction(input: {
  sourceId: SourceId
  title: string
  rules: FilterRule[]
}): FilterRuleDecision {
  let lastMatch: FilterRule | null = null
  let lastAction: FilterRuleAction | null = null
  const subgroup = extractSubgroup(input.sourceId, input.title)

  for (const rule of [...input.rules].sort((left, right) => left.order - right.order)) {
    if (!rule.enabled || !rule.sourceIds.includes(input.sourceId)) {
      continue
    }

    if (!matchesRule(rule, input.title, subgroup)) {
      continue
    }

    lastMatch = rule
    lastAction = rule.action
  }

  if (!lastMatch || !lastAction) {
    return {
      accepted: true,
      matchedRule: null,
      action: null,
      message: ""
    }
  }

  return {
    accepted: lastAction === "include",
    matchedRule: lastMatch,
    action: lastAction,
    message: `Matched filter rule: ${lastMatch.name}`
  }
}

function matchesRule(rule: FilterRule, title: string, subgroup: string): boolean {
  const normalizedTitle = title.toLowerCase()
  const normalizedSubgroup = subgroup.toLowerCase()

  if (
    rule.conditions.titleIncludes.length > 0 &&
    !rule.conditions.titleIncludes.every((keyword) => normalizedTitle.includes(keyword.toLowerCase()))
  ) {
    return false
  }

  if (
    rule.conditions.titleExcludes.length > 0 &&
    !rule.conditions.titleExcludes.some((keyword) => normalizedTitle.includes(keyword.toLowerCase()))
  ) {
    return false
  }

  if (
    rule.conditions.subgroupIncludes.length > 0 &&
    !rule.conditions.subgroupIncludes.every((keyword) => normalizedSubgroup.includes(keyword.toLowerCase()))
  ) {
    return false
  }

  return true
}
