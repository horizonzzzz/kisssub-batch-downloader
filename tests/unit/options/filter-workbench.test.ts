import { describe, expect, it } from "vitest"

import {
  runWorkbenchTest,
  type FilterWorkbenchSourceId
} from "../../../components/options/pages/filters/filter-workbench"
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
    field: "subgroup",
    operator: "contains",
    value: "LoliHouse",
    ...overrides
  }
}

function createRule(overrides: Partial<FilterRule> = {}): FilterRule {
  return {
    id: "rule-1",
    name: "排除 LoliHouse",
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
    name: "字幕组过滤",
    description: "",
    enabled: true,
    rules: [createRule()],
    ...overrides
  }
}

describe("runWorkbenchTest", () => {
  it("ignores manual subgroup overrides and relies on title extraction", () => {
    const input: {
      source: FilterWorkbenchSourceId
      title: string
      subgroup: string
    } = {
      source: "kisssub",
      title: "[LoliHouse] 葬送的芙莉莲 - 01 [1080p]",
      subgroup: "SubsPlease"
    }
    const result = runWorkbenchTest(input, [createGroup()])

    expect(result).toMatchObject({
      state: "result",
      accepted: false,
      label: "拦截"
    })
    expect(result.trace).toContain("参与匹配的字幕组：LoliHouse。")
  })

  it("extracts subgroup from the title instead of relying on manual overrides", () => {
    const result = runWorkbenchTest({
      source: "kisssub",
      title: "[LoliHouse] 葬送的芙莉莲 - 01 [1080p]"
    }, [createGroup()])

    expect(result).toMatchObject({
      state: "result",
      accepted: false,
      label: "拦截"
    })
    expect(result.trace).toContain("参与匹配的字幕组：LoliHouse。")
  })

  it("extracts subgroup tokens that appear later in the title", () => {
    const result = runWorkbenchTest({
      source: "kisssub",
      title: "Frieren - 01 [LoliHouse] [1080p]"
    }, [createGroup()])

    expect(result).toMatchObject({
      state: "result",
      accepted: false,
      label: "拦截"
    })
    expect(result.trace).toContain("参与匹配的字幕组：LoliHouse。")
  })

  it("shows default blocking when include rules are enabled but no rule matches", () => {
    const result = runWorkbenchTest(
      {
        source: "kisssub",
        title: "[LoliHouse] 葬送的芙莉莲 - 01 [1080p]"
      },
      [
        createGroup({
          name: "保留规则",
          rules: [
            createRule({
              action: "include",
              name: "仅保留喵萌",
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
    )

    expect(result).toMatchObject({
      state: "result",
      accepted: false,
      label: "拦截"
    })
    expect(result.summary).toContain("默认策略拦截")
  })

  it("does not switch default blocking mode when include rules are disabled", () => {
    const result = runWorkbenchTest(
      {
        source: "kisssub",
        title: "[LoliHouse] 葬送的芙莉莲 - 01 [1080p]"
      },
      [
        createGroup({
          name: "保留规则",
          rules: [
            createRule({
              action: "include",
              name: "仅保留喵萌",
              enabled: false,
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
    )

    expect(result).toMatchObject({
      state: "result",
      accepted: true,
      label: "放行"
    })
    expect(result.summary).toContain("默认策略放行")
  })

  it("keeps items in include mode when the subgroup token appears later in the title", () => {
    const result = runWorkbenchTest(
      {
        source: "kisssub",
        title: "Frieren - 01 [LoliHouse] [1080p]"
      },
      [
        createGroup({
          name: "保留规则",
          rules: [
            createRule({
              action: "include",
              name: "仅保留 LoliHouse",
              conditions: [
                createCondition({
                  field: "subgroup",
                  operator: "contains",
                  value: "LoliHouse"
                })
              ]
            })
          ]
        })
      ]
    )

    expect(result).toMatchObject({
      state: "result",
      accepted: true,
      label: "放行"
    })
    expect(result.summary).toContain("仅保留 LoliHouse")
    expect(result.trace).toContain("参与匹配的字幕组：LoliHouse。")
  })

  it("uses the first subgroup token for 字幕社 titles in the workbench trace and decision", () => {
    const result = runWorkbenchTest(
      {
        source: "kisssub",
        title:
          "[爱恋字幕社][1月新番][金牌得主 第二季][Medalist][08][1080p][MP4][GB][简中]"
      },
      [
        createGroup({
          name: "test",
          rules: [
            createRule({
              name: "拦截720",
              action: "exclude",
              conditions: [
                createCondition({
                  field: "title",
                  operator: "contains",
                  value: "720"
                })
              ]
            }),
            createRule({
              name: "过滤",
              action: "include",
              conditions: [
                createCondition({
                  field: "title",
                  operator: "contains",
                  value: "1080"
                }),
                createCondition({
                  id: "condition-2",
                  field: "title",
                  operator: "contains",
                  value: "简"
                }),
                createCondition({
                  id: "condition-3",
                  field: "subgroup",
                  operator: "is",
                  value: "爱恋字幕社"
                })
              ]
            })
          ]
        })
      ]
    )

    expect(result).toMatchObject({
      state: "result",
      accepted: true,
      label: "放行"
    })
    expect(result.summary).toContain("命中策略组「test」中的规则「过滤」")
    expect(result.trace).toContain("参与匹配的字幕组：爱恋字幕社。")
  })
})
