import { describe, expect, it } from "vitest"

import { createBatchPanelFilterStatus } from "../../../components/batch-panel/filter-status"
import type { FilterCondition, FilterEntry } from "../../../lib/shared/types"

function createCondition(
  overrides: Partial<FilterCondition> = {}
): FilterCondition {
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

describe("createBatchPanelFilterStatus", () => {
  it("builds the default empty-state copy when no effective filters exist", () => {
    expect(
      createBatchPanelFilterStatus({
        sourceId: "kisssub",
        filters: []
      })
    ).toEqual({
      summaryText: "筛选规则：未启用",
      emptyStateText: "当前站点未加载可生效的筛选规则，默认全部保留。",
      filters: []
    })
  })

  it("includes only effective filters with human-readable summaries", () => {
    const result = createBatchPanelFilterStatus({
      sourceId: "bangumimoe",
      filters: [
        createFilter({
          id: "global-filter",
          name: "保留 1080",
          must: [createCondition({ field: "title", value: "1080" })]
        }),
        createFilter({
          id: "site-filter",
          name: "Bangumi 专用",
          must: [
            createCondition({
              id: "condition-source-2",
              field: "source",
              operator: "is",
              value: "bangumimoe"
            })
          ]
        }),
        createFilter({
          id: "other-site-filter",
          name: "Kisssub 专用",
          must: [
            createCondition({
              id: "condition-source-3",
              field: "source",
              operator: "is",
              value: "kisssub"
            })
          ]
        })
      ]
    })

    expect(result.summaryText).toBe("筛选规则：已启用 2 条")
    expect(result.emptyStateText).toBeNull()
    expect(result.filters).toEqual([
      {
        id: "global-filter",
        name: "保留 1080",
        summary: "标题包含“1080”"
      },
      {
        id: "site-filter",
        name: "Bangumi 专用",
        summary: "站点是 Bangumi.moe"
      }
    ])
  })
})
