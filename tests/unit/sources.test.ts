import { describe, expect, it } from "vitest"

import { getSourceAdapterById, getSourceAdapterForPage } from "../../lib/sources"
import { normalizeBatchItems } from "../../lib/batch"

describe("source registry", () => {
  it("resolves the source adapter for supported list pages", () => {
    expect(getSourceAdapterForPage(new URL("https://www.kisssub.org/list-test.html"))?.id).toBe("kisssub")
    expect(getSourceAdapterForPage(new URL("https://www.dongmanhuayuan.com/"))?.id).toBe(
      "dongmanhuayuan"
    )
  })

  it("resolves known adapters by id", () => {
    expect(getSourceAdapterById("kisssub")?.displayName).toBe("Kisssub")
    expect(getSourceAdapterById("dongmanhuayuan")?.displayName).toBe("动漫花园")
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
      }
    ])
  })
})
