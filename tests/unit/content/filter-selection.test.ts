import { describe, expect, it } from "vitest"

import { buildSelectableBatchItem } from "../../../src/lib/content/filter-selection"
import type { FilterCondition, FilterEntry } from "../../../src/lib/shared/types"

function createCondition(overrides: Partial<FilterCondition> = {}): FilterCondition {
  if (overrides.field === "source") {
    return {
      id: "condition-source",
      field: "source",
      operator: "is",
      value: "kisssub",
      ...overrides
    } as FilterCondition
  }

  return {
    id: "condition-title",
    field: "title",
    operator: "contains",
    value: "1080",
    ...overrides
  } as FilterCondition
}

function createFilter(overrides: Partial<FilterEntry> = {}): FilterEntry {
  return {
    id: "filter-1",
    name: "保留 1080",
    enabled: true,
    must: [createCondition()],
    any: [],
    ...overrides
  }
}

describe("buildSelectableBatchItem", () => {
  it("marks items as selectable when no enabled filters exist", () => {
    expect(
      buildSelectableBatchItem(
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-1.html",
          title: "[LoliHouse] Example 720p"
        },
        []
      )
    ).toMatchObject({
      selectable: true,
      blockedReason: "",
      blockedReasonCode: null
    })
  })

  it("marks unmatched items with an unmatched-rule reason code", () => {
    expect(
      buildSelectableBatchItem(
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-2.html",
          title: "[LoliHouse] Example 720p"
        },
        [
          createFilter({
            must: [
              createCondition({
                field: "subgroup",
                value: "爱恋字幕社"
              })
            ]
          })
        ]
      )
    ).toMatchObject({
      selectable: false,
      blockedReason: "Blocked by filters: no filter matched",
      blockedReasonCode: "unmatched-rule"
    })
  })

  it("keeps items selectable when enabled rules only target other sites", () => {
    expect(
      buildSelectableBatchItem(
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-4.html",
          title: "[LoliHouse] Example 720p"
        },
        [
          createFilter({
            must: [
              createCondition({
                field: "source",
                operator: "is",
                value: "bangumimoe"
              })
            ]
          })
        ]
      )
    ).toMatchObject({
      selectable: true,
      blockedReason: "",
      blockedReasonCode: null
    })
  })

  it("keeps the original item payload for selectable items", () => {
    const item = {
      sourceId: "kisssub" as const,
      detailUrl: "https://www.kisssub.org/show-3.html",
      title: "[爱恋字幕社] Example 1080p"
    }

    expect(
      buildSelectableBatchItem(item, [
        createFilter({
          must: [
            createCondition({
              field: "subgroup",
              value: "爱恋字幕社"
            })
          ]
        })
      ])
    ).toMatchObject({
      item,
      selectable: true,
      blockedReason: "",
      blockedReasonCode: null
    })
  })
})

