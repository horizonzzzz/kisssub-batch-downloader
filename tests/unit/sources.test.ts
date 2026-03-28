import { describe, expect, it } from "vitest"

import { getSourceAdapterById, getSourceAdapterForPage } from "../../lib/sources"
import { normalizeBatchItems } from "../../lib/background/preparation"
import { DEFAULT_SOURCE_DELIVERY_MODES, getSupportedDeliveryModes } from "../../lib/sources/delivery"
import { SOURCE_IDS } from "../../lib/sources/catalog"
import { SITE_CONFIG_META } from "../../lib/sources/site-meta"

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
    expect(getSourceAdapterForPage(new URL("https://bangumi.moe/"))?.id).toBe("bangumimoe")
    expect(getSourceAdapterForPage(new URL("https://bangumi.moe/search/index"))?.id).toBe("bangumimoe")
  })

  it("resolves known adapters by id", () => {
    expect(getSourceAdapterById("kisssub")?.displayName).toBe("Kisssub")
    expect(getSourceAdapterById("dongmanhuayuan")?.displayName).toBe("动漫花园")
    expect(getSourceAdapterById("acgrip" as never)?.displayName).toBe("ACG.RIP")
    expect(getSourceAdapterById("bangumimoe" as never)?.displayName).toBe("Bangumi.moe")
  })

  it("exposes source-specific delivery mode capabilities", () => {
    expect(getSupportedDeliveryModes("kisssub")).toEqual(["magnet", "torrent-url", "torrent-file"])
    expect(getSupportedDeliveryModes("dongmanhuayuan")).toEqual(["magnet"])
    expect(getSupportedDeliveryModes("acgrip")).toEqual(["torrent-url", "torrent-file"])
    expect(getSupportedDeliveryModes("bangumimoe" as never)).toEqual(["magnet", "torrent-url", "torrent-file"])
    expect(DEFAULT_SOURCE_DELIVERY_MODES).toEqual({
      kisssub: "magnet",
      dongmanhuayuan: "magnet",
      acgrip: "torrent-file",
      bangumimoe: "magnet"
    })
  })

  it("keeps shared source metadata aligned with the registered adapters", () => {
    expect(SOURCE_IDS).toEqual(["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"])
    expect(Object.keys(SITE_CONFIG_META)).toEqual(SOURCE_IDS)

    for (const sourceId of SOURCE_IDS) {
      expect(getSourceAdapterById(sourceId)?.id).toBe(sourceId)
      expect(SITE_CONFIG_META[sourceId].id).toBe(sourceId)
    }
  })

  it("keeps overview accent metadata alongside the shared site configuration", () => {
    expect(SITE_CONFIG_META.kisssub.overviewAccent).toBe("default")
    expect(SITE_CONFIG_META.dongmanhuayuan.overviewAccent).toBe("emerald")
    expect(SITE_CONFIG_META.acgrip.overviewAccent).toBe("cyan")
    expect(SITE_CONFIG_META.bangumimoe.overviewAccent).toBe("default")
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
        },
        {
          sourceId: "bangumimoe" as never,
          detailUrl: "https://bangumi.moe/torrent/69c28b1384f11a93b5ff76a6",
          title: "[ANi] Episode 01",
          magnetUrl: "magnet:?xt=urn:btih:fbb0a8643346ca3e2d75a30c346113d12b268044"
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
      },
      {
        sourceId: "bangumimoe",
        detailUrl: "https://bangumi.moe/torrent/69c28b1384f11a93b5ff76a6",
        title: "[ANi] Episode 01",
        magnetUrl: "magnet:?xt=urn:btih:fbb0a8643346ca3e2d75a30c346113d12b268044"
      }
    ])
  })
})
