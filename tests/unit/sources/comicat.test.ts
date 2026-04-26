import { describe, expect, it } from "vitest"

import {
  comicatSourceAdapter,
  parseComicatDetailSnapshot,
  resolveComicatPublicTorrentUrl
} from "../../../src/lib/sources/comicat"

describe("parseComicatDetailSnapshot", () => {
  it("builds magnet and public uploadbt torrent urls from page data", () => {
    expect(
      parseComicatDetailSnapshot({
        title: "[Group] Episode 01",
        hash: "86584c42ac1abb6a346effaa1faff53448f1b71a",
        announce: "http://open.acgtracker.com:1096/announce",
        torrentUrl:
          "https://v2.uploadbt.com/?r=down&hash=86584c42ac1abb6a346effaa1faff53448f1b71a&name=%5BComicat%5DEpisode%2001"
      })
    ).toEqual({
      ok: true,
      title: "[Group] Episode 01",
      hash: "86584c42ac1abb6a346effaa1faff53448f1b71a",
      magnetUrl:
        "magnet:?xt=urn:btih:86584c42ac1abb6a346effaa1faff53448f1b71a&tr=http://open.acgtracker.com:1096/announce",
      torrentUrl:
        "https://v2.uploadbt.com/?r=down&hash=86584c42ac1abb6a346effaa1faff53448f1b71a&name=%5BComicat%5DEpisode%2001",
      failureReason: ""
    })
  })

  it("builds a public uploadbt torrent URL from Config when the download anchor is missing", () => {
    expect(
      parseComicatDetailSnapshot({
        title: "Episode 02",
        hash: "86584c42ac1abb6a346effaa1faff53448f1b71a",
        announce: "http://open.acgtracker.com:1096/announce",
        torrentUrl: "",
        torrentFormat: "[Comicat]%s",
        detailUrl: "https://www.comicat.org/show-86584c42ac1abb6a346effaa1faff53448f1b71a.html"
      } as never)
    ).toMatchObject({
      torrentUrl:
        "https://v2.uploadbt.com/?r=down&hash=86584c42ac1abb6a346effaa1faff53448f1b71a&name=%5BComicat%5DEpisode%2002"
    })
  })

  it("fails when both hash and torrentUrl are missing", () => {
    expect(
      parseComicatDetailSnapshot({
        title: "Episode 02",
        hash: "",
        announce: "",
        torrentUrl: ""
      })
    ).toMatchObject({
      ok: false,
      failureReason: "The Comicat detail page no longer exposes the fields required to build download links."
    })
  })
})

describe("resolveComicatPublicTorrentUrl", () => {
  it("accepts protocol-relative uploadbt download links", () => {
    expect(
      resolveComicatPublicTorrentUrl(
        "//v2.uploadbt.com/?r=down&hash=86584c42ac1abb6a346effaa1faff53448f1b71a&name=%5BComicat%5DEpisode%2001",
        "https://www.comicat.org/show-86584c42ac1abb6a346effaa1faff53448f1b71a.html"
      )
    ).toBe(
      "https://v2.uploadbt.com/?r=down&hash=86584c42ac1abb6a346effaa1faff53448f1b71a&name=%5BComicat%5DEpisode%2001"
    )
  })

  it("rejects cookie-gated down.php fallback links", () => {
    expect(
      resolveComicatPublicTorrentUrl(
        "/down.php?date=1777087202&hash=86584c42ac1abb6a346effaa1faff53448f1b71a",
        "https://www.comicat.org/show-86584c42ac1abb6a346effaa1faff53448f1b71a.html"
      )
    ).toBe("")
  })
})

describe("comicatSourceAdapter", () => {
  it("recognizes comicat search pages and detail urls", () => {
    expect(comicatSourceAdapter.matchesListPage(new URL("https://www.comicat.org/search.php?keyword=Re%3AZero"))).toBe(true)
    expect(comicatSourceAdapter.matchesDetailUrl(new URL("https://www.comicat.org/show-86584c42ac1abb6a346effaa1faff53448f1b71a.html"))).toBe(true)
  })

  it("recognizes comicat homepage and paginated list pages", () => {
    expect(comicatSourceAdapter.matchesListPage(new URL("https://www.comicat.org/"))).toBe(true)
    expect(comicatSourceAdapter.matchesListPage(new URL("https://www.comicat.org/public/html/start/"))).toBe(false)
    expect(comicatSourceAdapter.matchesListPage(new URL("https://www.comicat.org/1.html"))).toBe(true)
    expect(comicatSourceAdapter.matchesListPage(new URL("https://www.comicat.org/sort-1-1.html"))).toBe(true)
    expect(comicatSourceAdapter.matchesListPage(new URL("https://www.comicat.org/animovie-1.html"))).toBe(true)
  })

  it("rejects detail pages as list pages", () => {
    expect(comicatSourceAdapter.matchesListPage(new URL("https://www.comicat.org/show-86584c42ac1abb6a346effaa1faff53448f1b71a.html"))).toBe(false)
  })
})
