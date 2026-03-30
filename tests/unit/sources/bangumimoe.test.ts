import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "../../../lib/settings"
import {
  bangumiMoeSourceAdapter,
  parseBangumiMoeDetailSnapshot
} from "../../../lib/sources/bangumimoe"

const { withDetailTab } = vi.hoisted(() => ({
  withDetailTab: vi.fn()
}))

vi.mock("../../../lib/sources/detail-tab", () => ({
  withDetailTab
}))

describe("parseBangumiMoeDetailSnapshot", () => {
  it("returns both magnet and torrent download urls exposed by the detail dialog", () => {
    expect(
      parseBangumiMoeDetailSnapshot(
        {
          title: " [ANi]  Episode 01 ",
          torrentId: "69c28b1384f11a93b5ff76a6",
          magnetUrl: "magnet:?xt=urn:btih:fbb0a8643346ca3e2d75a30c346113d12b268044",
          torrentDownloadUrl:
            "https://bangumi.moe/download/torrent/69c28b1384f11a93b5ff76a6/%5BANi%5D%20%20Episode%2001.torrent"
        },
        "https://bangumi.moe/torrent/69c28b1384f11a93b5ff76a6"
      )
    ).toEqual({
      ok: true,
      title: "[ANi] Episode 01",
      hash: "69c28b1384f11a93b5ff76a6",
      magnetUrl: "magnet:?xt=urn:btih:fbb0a8643346ca3e2d75a30c346113d12b268044",
      torrentUrl:
        "https://bangumi.moe/download/torrent/69c28b1384f11a93b5ff76a6/%5BANi%5D%20%20Episode%2001.torrent",
      failureReason: ""
    })
  })

  it("falls back to the torrent id when no actionable download link is exposed", () => {
    expect(
      parseBangumiMoeDetailSnapshot(
        {
          title: "[ANi] Episode 01",
          torrentId: "",
          magnetUrl: "",
          torrentDownloadUrl: ""
        },
        "https://bangumi.moe/torrent/69c28b1384f11a93b5ff76a6"
      )
    ).toEqual({
      ok: false,
      title: "[ANi] Episode 01",
      hash: "69c28b1384f11a93b5ff76a6",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "The detail page finished loading, but no usable magnet or torrent URL was exposed."
    })
  })
})

describe("bangumiMoeSourceAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
    withDetailTab.mockReset()
  })

  it("matches homepage and search pages while rejecting detail pages", () => {
    expect(bangumiMoeSourceAdapter.matchesListPage(new URL("https://bangumi.moe/"))).toBe(true)
    expect(bangumiMoeSourceAdapter.matchesListPage(new URL("https://bangumi.moe/search/index"))).toBe(true)
    expect(bangumiMoeSourceAdapter.matchesListPage(new URL("https://bangumi.moe/search/581be821ee98e9ca20730eae"))).toBe(
      true
    )
    expect(
      bangumiMoeSourceAdapter.matchesListPage(
        new URL("https://bangumi.moe/torrent/69c28b1384f11a93b5ff76a6")
      )
    ).toBe(false)
  })

  it("extracts batch items from list cards even though the detail anchor only contains the icon", () => {
    const pageUrl = new URL("https://bangumi.moe/")
    document.body.innerHTML = `
      <md-list class="torrent-list">
        <md-list-item>
          <div class="md-tile-content">
            <div class="torrent-title">
              <h3 class="md-item-raised-title">
                <span>[LoliHouse] Episode 01</span>
                <small><a href="/torrent/69c292d784f11a93b5ffffc0" target="_blank"><i class="fa fa-external-link"></i></a></small>
              </h3>
            </div>
          </div>
        </md-list-item>
        <md-list-item>
          <div class="md-tile-content">
            <div class="torrent-title">
              <h3 class="md-item-raised-title">
                <span>[ANi] Episode 02</span>
                <small><a href="/torrent/69c28b1384f11a93b5ff76a6" target="_blank"><i class="fa fa-external-link"></i></a></small>
              </h3>
            </div>
          </div>
        </md-list-item>
      </md-list>
    `

    expect(bangumiMoeSourceAdapter.getDetailAnchors(document, pageUrl)).toHaveLength(2)
    expect(
      bangumiMoeSourceAdapter.getDetailAnchors(document, pageUrl).map((anchor) =>
        bangumiMoeSourceAdapter.getBatchItemFromAnchor(anchor, pageUrl)
      )
    ).toEqual([
      {
        sourceId: "bangumimoe",
        detailUrl: "https://bangumi.moe/torrent/69c292d784f11a93b5ffffc0",
        title: "[LoliHouse] Episode 01"
      },
      {
        sourceId: "bangumimoe",
        detailUrl: "https://bangumi.moe/torrent/69c28b1384f11a93b5ff76a6",
        title: "[ANi] Episode 02"
      }
    ])
  })

  it("uses the detail tab flow and keeps the derived torrent download url", async () => {
    withDetailTab.mockResolvedValue({
      title: "[ANi]  Episode 01",
      torrentId: "69c28b1384f11a93b5ff76a6",
      magnetUrl: "magnet:?xt=urn:btih:fbb0a8643346ca3e2d75a30c346113d12b268044",
      torrentDownloadUrl:
        "https://bangumi.moe/download/torrent/69c28b1384f11a93b5ff76a6/%5BANi%5D%20%20Episode%2001.torrent"
    })

    await expect(
      bangumiMoeSourceAdapter.extractSingleItem(
        {
          sourceId: "bangumimoe" as never,
          detailUrl: "https://bangumi.moe/torrent/69c28b1384f11a93b5ff76a6",
          title: "[ANi] Episode 01"
        },
        {
          ...DEFAULT_SETTINGS,
          retryCount: 0
        }
      )
    ).resolves.toEqual({
      ok: true,
      title: "[ANi] Episode 01",
      detailUrl: "https://bangumi.moe/torrent/69c28b1384f11a93b5ff76a6",
      hash: "69c28b1384f11a93b5ff76a6",
      magnetUrl: "magnet:?xt=urn:btih:fbb0a8643346ca3e2d75a30c346113d12b268044",
      torrentUrl:
        "https://bangumi.moe/download/torrent/69c28b1384f11a93b5ff76a6/%5BANi%5D%20%20Episode%2001.torrent",
      failureReason: ""
    })

    expect(withDetailTab).toHaveBeenCalledWith(
      "https://bangumi.moe/torrent/69c28b1384f11a93b5ff76a6",
      15000,
      expect.any(Function)
    )
  })
})
