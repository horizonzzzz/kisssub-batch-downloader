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
  it("allows unmatched items when only exclude rules are enabled", () => {
    const result = decideFilterGroupAction({
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

    expect(result).toMatchObject({
      accepted: true,
      matchedGroup: null,
      matchedRule: null,
      action: null
    })
    expect(result.message).toBe("未命中任何已启用规则，且当前仅配置拦截规则，按默认策略放行。")
    expect(result.trace[result.trace.length - 1]).toContain("默认策略放行")
  })

  it("blocks unmatched items when at least one enabled include rule exists", () => {
    const result = decideFilterGroupAction({
      sourceId: "kisssub",
      title: "[LoliHouse] Summer Pockets 01 [1080p]",
      groups: [
        createGroup({
          id: "group-include",
          name: "字幕组保留",
          rules: [
            createRule({
              id: "rule-include",
              name: "仅保留喵萌",
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
        })
      ]
    })

    expect(result).toMatchObject({
      accepted: false,
      matchedGroup: null,
      matchedRule: null,
      action: null
    })
    expect(result.message).toBe("命中过滤默认策略：存在启用的匹配放行规则，但当前资源未命中任何放行规则。")
    expect(result.trace[result.trace.length - 1]).toContain("默认策略拦截")
  })

  it("extracts subgroup text from the title when subgroup input is omitted", () => {
    expect(
      decideFilterGroupAction({
        sourceId: "kisssub",
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

  it("matches include rules for 字幕社 titles using the extracted first subgroup token", () => {
    expect(
      decideFilterGroupAction({
        sourceId: "kisssub",
        title: "[爱恋字幕社][1月新番][金牌得主 第二季][Medalist][08][1080p][MP4][GB][简中]",
        groups: [
          createGroup({
            id: "group-include",
            name: "字幕组保留",
            rules: [
              createRule({
                id: "rule-include",
                name: "保留爱恋字幕社",
                action: "include",
                conditions: [
                  createCondition({
                    field: "title",
                    operator: "contains",
                    value: "1080"
                  }),
                  createCondition({
                    id: "condition-title-2",
                    field: "title",
                    operator: "contains",
                    value: "简"
                  }),
                  createCondition({
                    id: "condition-subgroup",
                    field: "subgroup",
                    operator: "is",
                    value: "爱恋字幕社"
                  })
                ]
              })
            ]
          })
        ]
      })
    ).toMatchObject({
      accepted: true,
      matchedGroup: expect.objectContaining({ name: "字幕组保留" }),
      matchedRule: expect.objectContaining({ name: "保留爱恋字幕社" }),
      action: "include",
      subgroup: "爱恋字幕社"
    })
  })

  it("keeps items when an include rule matches and stops immediately", () => {
    const result = decideFilterGroupAction({
      sourceId: "kisssub",
      title: "[喵萌奶茶屋] Summer Pockets 01 [1080p][RAW]",
      groups: [
        createGroup({
          id: "group-include",
          name: "字幕组保留",
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

    expect(result).toMatchObject({
      accepted: true,
      matchedGroup: expect.objectContaining({
        id: "group-include",
        name: "字幕组保留"
      }),
      matchedRule: expect.objectContaining({
        id: "rule-include",
        name: "保留喵萌"
      }),
      action: "include"
    })
    expect(result.trace.join("\n")).not.toContain("rule-exclude")
  })

  it("blocks items when an exclude rule matches and stops immediately", () => {
    const result = decideFilterGroupAction({
      sourceId: "kisssub",
      title: "[喵萌奶茶屋] Summer Pockets 01 [1080p][RAW]",
      groups: [
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
        }),
        createGroup({
          id: "group-include",
          name: "字幕组保留",
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
        })
      ]
    })

    expect(result).toMatchObject({
      accepted: false,
      matchedGroup: expect.objectContaining({
        id: "group-exclude",
        name: "RAW 拦截"
      }),
      matchedRule: expect.objectContaining({
        id: "rule-exclude",
        name: "排除 RAW"
      }),
      action: "exclude"
    })
    expect(result.trace.join("\n")).not.toContain("rule-include")
  })

  it("keeps first-match behavior when include and exclude rules are mixed", () => {
    expect(
      decideFilterGroupAction({
        sourceId: "kisssub",
        title: "[喵萌奶茶屋] Summer Pockets 01 [1080p][RAW]",
        groups: [
          createGroup({
            id: "group-mixed",
            name: "混合规则",
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
              }),
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
        id: "group-mixed",
        name: "混合规则"
      }),
      matchedRule: expect.objectContaining({
        id: "rule-include",
        name: "保留喵萌"
      }),
      action: "include"
    })
  })

  it("does not switch to include-default blocking when include rules are disabled", () => {
    const result = decideFilterGroupAction({
      sourceId: "kisssub",
      title: "[LoliHouse] Summer Pockets 01 [1080p]",
      groups: [
        createGroup({
          id: "group-include-disabled",
          name: "字幕组保留",
          rules: [
            createRule({
              id: "rule-include",
              name: "仅保留喵萌",
              enabled: false,
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
        })
      ]
    })

    expect(result).toMatchObject({
      accepted: true,
      matchedGroup: null,
      matchedRule: null,
      action: null
    })
    expect(result.message).toBe("未命中任何已启用规则，且当前仅配置拦截规则，按默认策略放行。")
    expect(result.trace[result.trace.length - 1]).toContain("默认策略放行")
  })
})
