import { describe, expect, it } from "vitest"

import {
  decideFilterAction,
  deriveEffectiveFilterSummary,
  matchesCondition,
  matchesFilter
} from "../../../lib/filter-rules"
import type {
  FilterCondition,
  FilterEntry
} from "../../../lib/shared/types"

function createCondition(
  overrides: Partial<FilterCondition> = {}
): FilterCondition {
  if (overrides.field === "source") {
    return {
      id: "condition-1",
      field: "source",
      operator: "is",
      value: "kisssub",
      ...overrides
    } as FilterCondition
  }

  return {
    id: "condition-1",
    field: "title",
    operator: "contains",
    value: "1080p",
    ...overrides
  } as FilterCondition
}

function createFilter(
  overrides: Partial<FilterEntry> = {}
): FilterEntry {
  return {
    id: "filter-1",
    name: "保留 1080p",
    enabled: true,
    must: [createCondition()],
    any: [],
    ...overrides
  }
}

describe("matchesCondition", () => {
  it("supports source equality conditions", () => {
    expect(
      matchesCondition(
        createCondition({
          field: "source",
          operator: "is",
          value: "kisssub"
        }),
        {
          sourceId: "kisssub",
          title: "Episode 01",
          subgroup: ""
        }
      )
    ).toEqual({
      matched: true
    })
  })

  it("matches title contains conditions case-insensitively", () => {
    expect(
      matchesCondition(createCondition({ value: "raw" }), {
        sourceId: "kisssub",
        title: "Episode 01 [RAW]",
        subgroup: ""
      })
    ).toEqual({
      matched: true
    })
  })
})

describe("matchesFilter", () => {
  it("requires every must condition to match", () => {
    expect(
      matchesFilter(
        createFilter({
          must: [
            createCondition({
              field: "title",
              value: "1080p"
            }),
            createCondition({
              id: "condition-2",
              field: "subgroup",
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

  it("requires at least one any condition when any conditions exist", () => {
    expect(
      matchesFilter(
        createFilter({
          must: [
            createCondition({
              field: "subgroup",
              value: "爱恋字幕社"
            })
          ],
          any: [
            createCondition({
              id: "condition-2",
              field: "title",
              value: "简中"
            }),
            createCondition({
              id: "condition-3",
              field: "title",
              value: "繁中"
            })
          ]
        }),
        {
          sourceId: "kisssub",
          title: "[爱恋字幕社] Medalist 08 [1080p][GB][日语]",
          subgroup: "爱恋字幕社"
        }
      ).matched
    ).toBe(false)
  })
})

describe("deriveEffectiveFilterSummary", () => {
  it("returns an empty-state reason when no enabled filters exist", () => {
    expect(
      deriveEffectiveFilterSummary({
        sourceId: "kisssub",
        filters: []
      })
    ).toMatchObject({
      effectiveCount: 0,
      hasEnabledFilters: false,
      emptyStateReason: "no-enabled-filters"
    })
  })

  it("includes global filters and matching site filters for the current source", () => {
    const result = deriveEffectiveFilterSummary({
      sourceId: "bangumimoe",
      filters: [
        createFilter({
          id: "global-filter",
          name: "保留 1080",
          must: [
            createCondition({
              field: "title",
              value: "1080"
            })
          ]
        }),
        createFilter({
          id: "site-filter",
          name: "Bangumi 专用",
          must: [
            createCondition({
              id: "condition-2",
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
              id: "condition-3",
              field: "source",
              operator: "is",
              value: "kisssub"
            })
          ]
        })
      ]
    })

    expect(result).toMatchObject({
      effectiveCount: 2,
      hasEnabledFilters: true,
      emptyStateReason: null
    })
    expect(result.filters.map((filter) => filter.name)).toEqual(["保留 1080", "Bangumi 专用"])
  })

  it("keeps an explicit empty-state reason when enabled filters only target other sites", () => {
    expect(
      deriveEffectiveFilterSummary({
        sourceId: "kisssub",
        filters: [
          createFilter({
            id: "site-filter",
            name: "Bangumi 专用",
            must: [
              createCondition({
                id: "condition-2",
                field: "source",
                operator: "is",
                value: "bangumimoe"
              })
            ]
          })
        ]
      })
    ).toMatchObject({
      effectiveCount: 0,
      hasEnabledFilters: true,
      emptyStateReason: "no-filters-for-source"
    })
  })
})

describe("decideFilterAction", () => {
  it("allows items by default when no enabled filters exist", () => {
    const result = decideFilterAction({
      sourceId: "kisssub",
      title: "[LoliHouse] Summer Pockets 01 [1080p]",
      filters: []
    })

    expect(result).toMatchObject({
      accepted: true,
      matchedFilter: null
    })
    expect(result.message).toBe("No enabled filters. Accepted by default.")
    expect(result.trace[result.trace.length - 1]).toContain("默认放行")
  })

  it("blocks items when filters are enabled but no filter matches", () => {
    const result = decideFilterAction({
      sourceId: "kisssub",
      title: "[LoliHouse] Summer Pockets 01 [1080p]",
      filters: [
        createFilter({
          name: "只保留喵萌",
          must: [
            createCondition({
              field: "subgroup",
              value: "喵萌奶茶屋"
            })
          ]
        })
      ]
    })

    expect(result).toMatchObject({
      accepted: false,
      matchedFilter: null
    })
    expect(result.message).toBe("Blocked by filters: no filter matched")
    expect(result.trace[result.trace.length - 1]).toContain("未命中任何筛选器")
  })

  it("extracts subgroup text from the title when subgroup input is omitted", () => {
    expect(
      decideFilterAction({
        sourceId: "kisssub",
        title: "[ANi] Dr.STONE - 01 [1080P][Baha]",
        filters: [
          createFilter({
            name: "保留 ANi",
            must: [
              createCondition({
                field: "subgroup",
                value: "ani"
              })
            ]
          })
        ]
      })
    ).toMatchObject({
      accepted: true,
      matchedFilter: expect.objectContaining({ name: "保留 ANi" }),
      subgroup: "ANi"
    })
  })

  it("matches two-level filters for 字幕社 titles using the extracted first subgroup token", () => {
    expect(
      decideFilterAction({
        sourceId: "kisssub",
        title: "[爱恋字幕社][1月新番][金牌得主 第二季][Medalist][08][1080p][MP4][GB][简中]",
        filters: [
          createFilter({
            name: "保留爱恋 1080 简繁",
            must: [
              createCondition({
                field: "subgroup",
                value: "爱恋字幕社"
              }),
              createCondition({
                id: "condition-title",
                field: "title",
                value: "1080"
              })
            ],
            any: [
              createCondition({
                id: "condition-title-2",
                field: "title",
                value: "简"
              }),
              createCondition({
                id: "condition-title-3",
                field: "title",
                value: "繁"
              })
            ]
          })
        ]
      })
    ).toMatchObject({
      accepted: true,
      matchedFilter: expect.objectContaining({ name: "保留爱恋 1080 简繁" }),
      subgroup: "爱恋字幕社"
    })
  })

  it("accepts when any enabled filter matches", () => {
    const result = decideFilterAction({
      sourceId: "kisssub",
      title: "[喵萌奶茶屋] Summer Pockets 01 [1080p]",
      filters: [
        createFilter({
          id: "filter-include",
          name: "保留喵萌",
          must: [
            createCondition({
              field: "subgroup",
              value: "喵萌奶茶屋"
            })
          ]
        }),
        createFilter({
          id: "filter-late",
          name: "保留 LoliHouse",
          must: [
            createCondition({
              field: "subgroup",
              value: "LoliHouse"
            })
          ]
        })
      ]
    })

    expect(result).toMatchObject({
      accepted: true,
      matchedFilter: expect.objectContaining({
        id: "filter-include",
        name: "保留喵萌"
      })
    })
    expect(result.message).toBe("Matched filter: 保留喵萌")
  })

  it("ignores disabled filters when deciding whether to block unmatched items", () => {
    const result = decideFilterAction({
      sourceId: "kisssub",
      title: "[LoliHouse] Summer Pockets 01 [1080p]",
      filters: [
        createFilter({
          name: "只保留喵萌",
          enabled: false,
          must: [
            createCondition({
              field: "subgroup",
              value: "喵萌奶茶屋"
            })
          ]
        })
      ]
    })

    expect(result).toMatchObject({
      accepted: true,
      matchedFilter: null
    })
    expect(result.message).toBe("No enabled filters. Accepted by default.")
  })
})
