import { describe, expect, it } from "vitest"

import {
  createAilian1080SimplifiedChineseFilter,
  runWorkbenchTest,
  type FilterWorkbenchFilter,
  type FilterWorkbenchSourceId
} from "../../../src/components/options/pages/filters/filter-workbench"
import type { FilterCondition } from "../../../src/lib/shared/types"

function createTextCondition(
  overrides: Partial<Extract<FilterCondition, { field: "title" | "subgroup" }>> = {}
): Extract<FilterCondition, { field: "title" | "subgroup" }> {
  return {
    id: "condition-1",
    field: "subgroup",
    operator: "contains",
    value: "LoliHouse",
    ...overrides
  }
}

function createFilter(overrides: Partial<FilterWorkbenchFilter> = {}): FilterWorkbenchFilter {
  return {
    id: "filter-1",
    name: "保留 LoliHouse",
    enabled: true,
    must: [createTextCondition()],
    any: [],
    ...overrides
  }
}

describe("filter workbench helpers", () => {
  it("creates the 爱恋 1080 简中 preset filter", () => {
    expect(createAilian1080SimplifiedChineseFilter()).toMatchObject({
      name: "爱恋 1080 简中",
      enabled: true,
      must: [
        {
          field: "subgroup",
          operator: "contains",
          value: "爱恋字幕社"
        },
        {
          field: "title",
          operator: "contains",
          value: "1080"
        },
        {
          field: "title",
          operator: "contains",
          value: "简中"
        }
      ],
      any: []
    })
  })
})

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
    const result = runWorkbenchTest(input, [createFilter()])

    expect(result).toMatchObject({
      state: "result",
      accepted: true,
      label: "保留",
      subgroup: "LoliHouse"
    })
  })

  it("extracts subgroup from the title instead of relying on manual overrides", () => {
    const result = runWorkbenchTest({
      source: "kisssub",
      title: "[LoliHouse] 葬送的芙莉莲 - 01 [1080p]"
    }, [createFilter()])

    expect(result).toMatchObject({
      state: "result",
      accepted: true,
      label: "保留",
      subgroup: "LoliHouse"
    })
  })

  it("extracts subgroup tokens that appear later in the title", () => {
    const result = runWorkbenchTest({
      source: "kisssub",
      title: "Frieren - 01 [LoliHouse] [1080p]"
    }, [createFilter()])

    expect(result).toMatchObject({
      state: "result",
      accepted: true,
      label: "保留",
      subgroup: "LoliHouse"
    })
  })

  it("shows blocking when enabled filters exist but nothing matches", () => {
    const result = runWorkbenchTest(
      {
        source: "kisssub",
        title: "[LoliHouse] 葬送的芙莉莲 - 01 [1080p]"
      },
      [
        createFilter({
          name: "仅保留喵萌",
          must: [
            createTextCondition({
              field: "subgroup",
              value: "喵萌奶茶屋"
            })
          ]
        })
      ]
    )

    expect(result).toMatchObject({
      state: "result",
      accepted: false,
      label: "拦截",
      matchedFilterName: null
    })
    expect(result.summary).toContain("未命中任何启用中的筛选器")
  })

  it("does not block when all matching filters are disabled", () => {
    const result = runWorkbenchTest(
      {
        source: "kisssub",
        title: "[LoliHouse] 葬送的芙莉莲 - 01 [1080p]"
      },
      [
        createFilter({
          name: "仅保留喵萌",
          enabled: false,
          must: [
            createTextCondition({
              field: "subgroup",
              value: "喵萌奶茶屋"
            })
          ]
        })
      ]
    )

    expect(result).toMatchObject({
      state: "result",
      accepted: true,
      label: "保留",
      matchedFilterName: null
    })
    expect(result.summary).toContain("当前没有启用筛选器")
  })

  it("keeps items when a later subgroup token matches", () => {
    const result = runWorkbenchTest(
      {
        source: "kisssub",
        title: "Frieren - 01 [LoliHouse] [1080p]"
      },
      [
        createFilter({
          name: "仅保留 LoliHouse",
          must: [
            createTextCondition({
              field: "subgroup",
              value: "LoliHouse"
            })
          ]
        })
      ]
    )

    expect(result).toMatchObject({
      state: "result",
      accepted: true,
      label: "保留",
      matchedFilterName: "仅保留 LoliHouse",
      subgroup: "LoliHouse"
    })
  })

  it("supports must + any for 字幕社 titles", () => {
    const result = runWorkbenchTest(
      {
        source: "kisssub",
        title:
          "[爱恋字幕社][1月新番][金牌得主 第二季][Medalist][08][1080p][MP4][GB][简中]"
      },
      [
        createFilter({
          name: "爱恋 1080 简繁",
          must: [
            createTextCondition({
              field: "subgroup",
              value: "爱恋字幕社"
            }),
            createTextCondition({
              id: "condition-2",
              field: "title",
              value: "1080"
            })
          ],
          any: [
            createTextCondition({
              id: "condition-3",
              field: "title",
              value: "简"
            }),
            createTextCondition({
              id: "condition-4",
              field: "title",
              value: "繁"
            })
          ]
        })
      ]
    )

    expect(result).toMatchObject({
      state: "result",
      accepted: true,
      label: "保留",
      matchedFilterName: "爱恋 1080 简繁",
      subgroup: "爱恋字幕社"
    })
  })
})
