import { describe, expect, it } from "vitest"

import { getSourceAdapterById, getSourceAdapterForPage } from "../../lib/sources"
import { normalizeBatchItems } from "../../lib/batch"
import { DEFAULT_SOURCE_DELIVERY_MODES, getSupportedDeliveryModes } from "../../lib/delivery"

describe("source registry", () => {
  it("resolves the source adapter for supported list pages", () => {
    expect(getSourceAdapterForPage(new URL("https://www.kisssub.org/list-test.html"))?.id).toBe("kisssub")
    expect(getSourceAdapterForPage(new URL("https://www.dongmanhuayuan.com/"))?.id).toBe(
      "dongmanhuayuan"
    )
    expect(getSourceAdapterForPage(new URL("https://acg.rip/"))?.id).toBe("acgrip")
    expect(getSourceAdapterForPage(new URL("https://acg.rip/page/2"))?.id).toBe("acgrip")
    expect(getSourceAdapterForPage(new URL("https://acg.rip/1"))?.id).toBe("acgrip")
    expect(getSourceAdapterForPage(new URL("https://acg.rip/series/1170"))?.id).toBe("acgrip")
  })

  it("resolves known adapters by id", () => {
    expect(getSourceAdapterById("kisssub")?.displayName).toBe("Kisssub")
    expect(getSourceAdapterById("dongmanhuayuan")?.displayName).toBe("动漫花园")
    expect(getSourceAdapterById("acgrip" as never)?.displayName).toBe("ACG.RIP")
  })

  it("exposes source-specific delivery mode capabilities", () => {
    expect(getSupportedDeliveryModes("kisssub")).toEqual(["magnet", "torrent-url", "torrent-file"])
    expect(getSupportedDeliveryModes("dongmanhuayuan")).toEqual(["magnet"])
    expect(getSupportedDeliveryModes("acgrip")).toEqual(["torrent-url", "torrent-file"])
    expect(DEFAULT_SOURCE_DELIVERY_MODES).toEqual({
      kisssub: "magnet",
      dongmanhuayuan: "magnet",
      acgrip: "torrent-file"
    })
  })
})

describe("normalizeBatchItems", () => {
  it("keeps valid source-aware items and rejects mismatched source/detail pairs", () => {
    expect(
      normalizeBatchItems([
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          title: "Episode 01"
        },
        {
          sourceId: "kisssub",
          detailUrl: "https://www.dongmanhuayuan.com/detail/G8Xvr.html",
          title: "Wrong site"
        },
        {
          sourceId: "dongmanhuayuan",
          detailUrl: "https://www.dongmanhuayuan.com/detail/G8Xvr.html",
          title: "Movie pack"
        },
        {
          sourceId: "acgrip",
          detailUrl: "https://acg.rip/t/350361",
          title: "Hell Mode - 11",
          torrentUrl: "https://acg.rip/t/350361.torrent"
        }
      ])
    ).toEqual([
      {
        sourceId: "kisssub",
        detailUrl: "https://www.kisssub.org/show-deadbeef.html",
        title: "Episode 01"
      },
      {
        sourceId: "dongmanhuayuan",
        detailUrl: "https://www.dongmanhuayuan.com/detail/G8Xvr.html",
        title: "Movie pack"
      },
      {
        sourceId: "acgrip",
        detailUrl: "https://acg.rip/t/350361",
        title: "Hell Mode - 11",
        torrentUrl: "https://acg.rip/t/350361.torrent"
      }
    ])
  })
})
