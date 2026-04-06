import { describe, expect, it } from "vitest"

import { extractSubgroup } from "../../../src/lib/filter-rules/subgroup"
import type { SourceId } from "../../../src/lib/shared/types"

describe("extractSubgroup", () => {
  it.each<{
    sourceId: SourceId
    title: string
    expected: string
  }>([
    {
      sourceId: "kisssub",
      title: "[喵萌奶茶屋&LoliHouse] Summer Pockets [01][1080p]",
      expected: "喵萌奶茶屋&LoliHouse"
    },
    {
      sourceId: "dongmanhuayuan",
      title: "【豌豆字幕组】[4月新番] 末日后酒店 01 [1080P][简体]",
      expected: "豌豆字幕组"
    },
    {
      sourceId: "acgrip",
      title: "[LoliHouse] Mono 01 [WebRip 1080p HEVC-10bit AAC][简繁内封字幕]",
      expected: "LoliHouse"
    },
    {
      sourceId: "bangumimoe",
      title: "[ANi] Dr.STONE - 01 [1080P][Baha][WEB-DL][AAC AVC][CHT]",
      expected: "ANi"
    },
    {
      sourceId: "kisssub",
      title: "Frieren - 01 [LoliHouse] [1080p]",
      expected: "LoliHouse"
    },
    {
      sourceId: "kisssub",
      title: "[爱恋字幕社][示例资源]",
      expected: "爱恋字幕社"
    },
    {
      sourceId: "kisssub",
      title: "[爱恋字幕社][1月新番][金牌得主 第二季][Medalist][08][1080p][MP4][GB][简中]",
      expected: "爱恋字幕社"
    }
  ])("extracts subgroup for $sourceId titles", ({ sourceId, title, expected }) => {
    expect(extractSubgroup(sourceId, title)).toBe(expected)
  })

  it("returns an empty string when the title has no recognizable subgroup", () => {
    expect(extractSubgroup("kisssub", "Summer Pockets Episode 01")).toBe("")
  })

  it("ignores later wrapped metadata tokens when no subgroup is present", () => {
    expect(
      extractSubgroup("kisssub", "Frieren - 01 [简繁内封字幕] [1080p]")
    ).toBe("")
  })

  it("does not treat subtitle metadata as a subgroup when it appears first", () => {
    expect(
      extractSubgroup("kisssub", "[简繁内封字幕][1080p]")
    ).toBe("")
  })
})
