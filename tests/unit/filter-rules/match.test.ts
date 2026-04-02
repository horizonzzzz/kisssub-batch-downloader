import { describe, expect, it } from "vitest"

import {
  decideFilterGroupAction,
  matchesCondition,
  matchesRule
} from "../../../lib/filter-rules"
import type {
  FilterCondition,
  FilterRule,
  FilterRuleGroup
} from "../../../lib/shared/types"

function createCondition(
  overrides: Partial<FilterCondition> = {}
): FilterCondition {
  return {
    id: "condition-1",
    field: "title",
    operator: "contains",
    value: "RAW",
    ...overrides
  }
}

function createRule(overrides: Partial<FilterRule> = {}): FilterRule {
  return {
    id: "rule-1",
    name: "排除 RAW",
    enabled: true,
    action: "exclude",
    relation: "and",
    conditions: [createCondition()],
    ...overrides
  }
}

function createGroup(overrides: Partial<FilterRuleGroup> = {}): FilterRuleGroup {
  return {
    id: "group-1",
    name: "默认策略组",
    description: "",
    enabled: true,
    rules: [createRule()],
    ...overrides
  }
}

describe("matchesCondition", () => {
  it("supports source equality conditions", () => {
    expect(
      matchesCondition(createCondition({
        field: "source",
        operator: "is",
        value: "kisssub"
      }), {
        sourceId: "kisssub",
        title: "Episode 01",
        subgroup: ""
      })
    ).toEqual({
      matched: true
    })
  })

  it("reports invalid regex conditions as non-matching errors", () => {
    const result = matchesCondition(createCondition({
      operator: "regex",
      value: "[RAW"
    }), {
      sourceId: "kisssub",
      title: "Episode 01 [RAW]",
      subgroup: ""
    })

    expect(result.matched).toBe(false)
    expect(result.error).toContain("无效正则")
  })
})

describe("matchesRule", () => {
  it("requires every condition when relation is and", () => {
    expect(
      matchesRule(
        createRule({
          relation: "and",
          conditions: [
            createCondition({
              field: "title",
              operator: "contains",
              value: "1080p"
            }),
            createCondition({
              id: "condition-2",
              field: "subgroup",
              operator: "contains",
              value: "喵萌奶茶屋"
            })
          ]
        }),
        {
          sourceId: "kisssub",
          title: "[LoliHouse] Episode 01 [1080p]",
          subgroup: "LoliHouse"
        }
      ).matched
    ).toBe(false)
  })

  it("matches when any condition succeeds under or relation", () => {
    expect(
      matchesRule(
        createRule({
          relation: "or",
          conditions: [
            createCondition({
              field: "title",
              operator: "contains",
              value: "2160p"
            }),
            createCondition({
              id: "condition-2",
              field: "title",
              operator: "contains",
              value: "1080p"
            })
          ]
        }),
        {
          sourceId: "kisssub",
          title: "[LoliHouse] Episode 01 [1080p]",
          subgroup: "LoliHouse"
        }
      ).matched
    ).toBe(true)
  })
})

describe("decideFilterGroupAction", () => {
  it("keeps items by default when no rule matches", () => {
    expect(
      decideFilterGroupAction({
        sourceId: "kisssub",
        title: "[LoliHouse] Summer Pockets 01 [1080p]",
        groups: [
          createGroup({
            rules: [
              createRule({
                conditions: [
                  createCondition({
                    value: "RAW"
                  })
                ]
              })
            ]
          })
        ]
      })
    ).toMatchObject({
      accepted: true,
      matchedGroup: null,
      matchedRule: null,
      action: null
    })
  })

  it("extracts subgroup text from the title when subgroup input is omitted", () => {
    expect(
      decideFilterGroupAction({
        sourceId: "bangumimoe",
        title: "[ANi] Dr.STONE - 01 [1080P][Baha]",
        groups: [
          createGroup({
            rules: [
              createRule({
                name: "排除 ANi",
                conditions: [
                  createCondition({
                    field: "subgroup",
                    operator: "contains",
                    value: "ani"
                  })
                ]
              })
            ]
          })
        ]
      })
    ).toMatchObject({
      accepted: false,
      matchedGroup: expect.objectContaining({ name: "默认策略组" }),
      matchedRule: expect.objectContaining({ name: "排除 ANi" }),
      action: "exclude",
      subgroup: "ANi"
    })
  })

  it("stops at the first matched rule across groups", () => {
    expect(
      decideFilterGroupAction({
        sourceId: "kisssub",
        title: "[喵萌奶茶屋] Summer Pockets 01 [1080p][RAW]",
        groups: [
          createGroup({
            id: "group-include",
            name: "字幕组优先放行",
            rules: [
              createRule({
                id: "rule-include",
                name: "保留喵萌",
                action: "include",
                conditions: [
                  createCondition({
                    field: "subgroup",
                    operator: "contains",
                    value: "喵萌奶茶屋"
                  })
                ]
              })
            ]
          }),
          createGroup({
            id: "group-exclude",
            name: "RAW 拦截",
            rules: [
              createRule({
                id: "rule-exclude",
                name: "排除 RAW",
                action: "exclude",
                conditions: [
                  createCondition({
                    field: "title",
                    operator: "contains",
                    value: "RAW"
                  })
                ]
              })
            ]
          })
        ]
      })
    ).toMatchObject({
      accepted: true,
      matchedGroup: expect.objectContaining({
        id: "group-include",
        name: "字幕组优先放行"
      }),
      matchedRule: expect.objectContaining({
        id: "rule-include",
        name: "保留喵萌"
      }),
      action: "include"
    })
  })
})
