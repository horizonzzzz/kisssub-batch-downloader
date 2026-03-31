import { describe, expect, it } from "vitest"

import { decideFilterRuleAction } from "../../../lib/filter-rules"
import type { FilterRule } from "../../../lib/shared/types"

function createRule(overrides: Partial<FilterRule> = {}): FilterRule {
  return {
    id: "rule-1",
    name: "排除生肉",
    enabled: true,
    action: "exclude",
    sourceIds: ["kisssub"],
    order: 0,
    conditions: {
      titleIncludes: [],
      titleExcludes: ["RAW"],
      subgroupIncludes: []
    },
    ...overrides
  }
}

describe("decideFilterRuleAction", () => {
  it("keeps items by default when no rule matches", () => {
    expect(
      decideFilterRuleAction({
        sourceId: "kisssub",
        title: "[LoliHouse] Summer Pockets 01 [1080p]",
        rules: [createRule()]
      })
    ).toEqual({
      accepted: true,
      matchedRule: null,
      action: null,
      message: ""
    })
  })

  it("requires every filled condition in a rule to match", () => {
    expect(
      decideFilterRuleAction({
        sourceId: "kisssub",
        title: "[LoliHouse] Summer Pockets 01 [1080p]",
        rules: [
          createRule({
            conditions: {
              titleIncludes: ["1080p"],
              titleExcludes: [],
              subgroupIncludes: ["喵萌奶茶屋"]
            }
          })
        ]
      }).accepted
    ).toBe(true)
  })

  it("matches subgroup conditions using extracted subgroup text", () => {
    expect(
      decideFilterRuleAction({
        sourceId: "bangumimoe",
        title: "[ANi] Dr.STONE - 01 [1080P][Baha]",
        rules: [
          createRule({
            sourceIds: ["bangumimoe"],
            conditions: {
              titleIncludes: [],
              titleExcludes: [],
              subgroupIncludes: ["ani"]
            }
          })
        ]
      })
    ).toMatchObject({
      accepted: false,
      matchedRule: expect.objectContaining({ name: "排除生肉" }),
      action: "exclude"
    })
  })

  it("matches title exclude keywords when any keyword is present", () => {
    expect(
      decideFilterRuleAction({
        sourceId: "kisssub",
        title: "[LoliHouse] Summer Pockets 01 [720p]",
        rules: [
          createRule({
            conditions: {
              titleIncludes: [],
              titleExcludes: ["RAW", "720p"],
              subgroupIncludes: []
            }
          })
        ]
      })
    ).toMatchObject({
      accepted: false,
      matchedRule: expect.objectContaining({ name: "排除生肉" }),
      action: "exclude"
    })
  })

  it("only applies rules to their selected source ids", () => {
    expect(
      decideFilterRuleAction({
        sourceId: "acgrip",
        title: "[LoliHouse] Mono 01 [1080p]",
        rules: [createRule({ sourceIds: ["kisssub"] })]
      }).accepted
    ).toBe(true)
  })

  it("lets later matched rules override earlier ones", () => {
    expect(
      decideFilterRuleAction({
        sourceId: "kisssub",
        title: "[喵萌奶茶屋] Summer Pockets 01 [1080p][RAW]",
        rules: [
          createRule({
            id: "rule-exclude",
            name: "排除 RAW",
            action: "exclude",
            order: 0,
            conditions: {
              titleIncludes: [],
              titleExcludes: ["RAW"],
              subgroupIncludes: []
            }
          }),
          createRule({
            id: "rule-include",
            name: "保留喵萌",
            action: "include",
            order: 1,
            conditions: {
              titleIncludes: [],
              titleExcludes: [],
              subgroupIncludes: ["喵萌奶茶屋"]
            }
          })
        ]
      })
    ).toEqual({
      accepted: true,
      matchedRule: expect.objectContaining({ id: "rule-include", name: "保留喵萌" }),
      action: "include",
      message: "Matched filter rule: 保留喵萌"
    })
  })
})
