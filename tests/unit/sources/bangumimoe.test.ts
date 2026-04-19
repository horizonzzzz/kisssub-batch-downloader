import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_BATCH_EXECUTION_CONFIG } from "../../../src/lib/batch-config/defaults"
import {
  bangumiMoeSourceAdapter,
  parseBangumiMoeDetailSnapshot
} from "../../../src/lib/sources/bangumimoe"
import type { ExtractionContext } from "../../../src/lib/sources/types"

const { withDetailTab } = vi.hoisted(() => ({
  withDetailTab: vi.fn()
}))

vi.mock("../../../src/lib/sources/detail-tab", () => ({
  withDetailTab
}))

function buildTestExtractionContext(overrides: Partial<ExtractionContext> = {}): ExtractionContext {
  return {
    execution: {
      retryCount: DEFAULT_BATCH_EXECUTION_CONFIG.retryCount,
      injectTimeoutMs: DEFAULT_BATCH_EXECUTION_CONFIG.injectTimeoutMs,
      domSettleMs: DEFAULT_BATCH_EXECUTION_CONFIG.domSettleMs
    },
    source: {
      kisssub: {
        script: {
          url: "",
          revision: ""
        }
      }
    },
    ...overrides
  }
}

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
    document.title = ""
    delete (window as typeof window & { angular?: unknown }).angular
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
        buildTestExtractionContext({
          execution: {
            retryCount: 0,
            injectTimeoutMs: DEFAULT_BATCH_EXECUTION_CONFIG.injectTimeoutMs,
            domSettleMs: DEFAULT_BATCH_EXECUTION_CONFIG.domSettleMs
          }
        })
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

  it("extracts title and torrent id from the rendered dialog scope", async () => {
    withDetailTab.mockImplementation(async (_detailUrl, _timeoutMs, run) => {
      window.history.replaceState({}, "", "/torrent/69cb76e484f11a93b5a327ff")

      const dialog = document.createElement("md-dialog")
      dialog.className = "torrent-details-dialog"
      dialog.innerHTML = `
        <a class="title-link">[爱恋字幕社][示例资源]</a>
        <a href="magnet:?xt=urn:btih:abcdef1234567890">磁力链接</a>
      `
      document.body.appendChild(dialog)

      ;(window as typeof window & {
        angular?: {
          element?: () => {
            scope?: () => {
              torrent?: { _id: string; title: string }
            }
          }
        }
      }).angular = {
        element: () => ({
          scope: () => ({
            torrent: { _id: "69cb76e484f11a93b5a327ff", title: "[爱恋字幕社][示例资源]" }
          })
        })
      }

      globalThis.chrome = {
        scripting: {
          executeScript: vi.fn(async ({ func, args = [] }) => [{ result: await func(...args) }])
        }
      } as unknown as typeof chrome

      return run(1)
    })

    await expect(
      bangumiMoeSourceAdapter.extractSingleItem(
        {
          sourceId: "bangumimoe" as never,
          detailUrl: "https://bangumi.moe/torrent/69cb76e484f11a93b5a327ff",
          title: "[爱恋字幕社][示例资源]"
        },
        buildTestExtractionContext({
          execution: {
            retryCount: 0,
            injectTimeoutMs: DEFAULT_BATCH_EXECUTION_CONFIG.injectTimeoutMs,
            domSettleMs: 0
          }
        })
      )
    ).resolves.toMatchObject({
      title: "[爱恋字幕社][示例资源]",
      torrentUrl: expect.stringContaining("/download/torrent/69cb76e484f11a93b5a327ff/"),
      hash: "69cb76e484f11a93b5a327ff",
      magnetUrl: expect.stringContaining("magnet:?xt=urn:btih:")
    })
  })
})