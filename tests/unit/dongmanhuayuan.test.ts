import { describe, expect, it } from "vitest"

import { parseDongmanhuayuanDetailSnapshot } from "../../lib/sources/dongmanhuayuan"

describe("parseDongmanhuayuanDetailSnapshot", () => {
  it("prefers the first usable magnet link and derives the hash from it", () => {
    expect(
      parseDongmanhuayuanDetailSnapshot(
        {
          title: "资源一",
          magnetCandidates: [
            "not-a-magnet",
            "magnet:?xt=urn:btih:A4VMZMO3DOA4SKU4IDCOW7FCC2OG2JGC",
            "magnet:?xt=urn:btih:072accb1db1b81c92a9c40c4eb7ca2169c6d24c2"
          ]
        },
        "https://www.dongmanhuayuan.com/detail/7XROA.html"
      )
    ).toEqual({
      ok: true,
      title: "资源一",
      hash: "a4vmzmo3doa4sku4idcow7fcc2og2jgc",
      magnetUrl: "magnet:?xt=urn:btih:A4VMZMO3DOA4SKU4IDCOW7FCC2OG2JGC",
      torrentUrl: "",
      failureReason: ""
    })
  })

  it("falls back to the detail id when the page exposes no magnet links", () => {
    expect(
      parseDongmanhuayuanDetailSnapshot(
        {
          title: "资源二",
          magnetCandidates: []
        },
        "https://www.dongmanhuayuan.com/detail/69Q29.html"
      )
    ).toEqual({
      ok: false,
      title: "资源二",
      hash: "69q29",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "The detail page finished loading, but no usable magnet URL was exposed."
    })
  })
})
