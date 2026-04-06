import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "../../../src/lib/settings"
import { kisssubSourceAdapter } from "../../../src/lib/sources/kisssub"

const { reloadDetailTab, withDetailTab } = vi.hoisted(() => ({
  withDetailTab: vi.fn(),
  reloadDetailTab: vi.fn()
}))

vi.mock("../../../src/lib/sources/detail-tab", () => ({
  withDetailTab,
  reloadDetailTab
}))

describe("kisssubSourceAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
    withDetailTab.mockReset()
    reloadDetailTab.mockReset()
  })

  it("matches supported list pages and rejects detail, addon, and user pages", () => {
    expect(kisssubSourceAdapter.matchesListPage(new URL("https://www.kisssub.org/list-test.html"))).toBe(true)
    expect(kisssubSourceAdapter.matchesListPage(new URL("https://www.kisssub.org/show-deadbeef.html"))).toBe(false)
    expect(kisssubSourceAdapter.matchesListPage(new URL("https://www.kisssub.org/addon.php"))).toBe(false)
    expect(kisssubSourceAdapter.matchesListPage(new URL("https://www.kisssub.org/user.php"))).toBe(false)
  })

  it("filters anchors down to valid detail pages on the current host", () => {
    const pageUrl = new URL("https://www.kisssub.org/list-test.html")
    document.body.innerHTML = `
      <ul>
        <li><a href="/show-deadbeef.html">Episode 01</a></li>
        <li><a href="https://www.kisssub.org/show-feedface.html">Episode 02</a></li>
        <li><a href="/show-nothex.html">Invalid hash</a></li>
        <li><a href="javascript:void(0)">Broken</a></li>
      </ul>
    `

    expect(kisssubSourceAdapter.getDetailAnchors(document, pageUrl).map((anchor) => anchor.textContent?.trim())).toEqual([
      "Episode 01",
      "Episode 02"
    ])
  })

  it("returns extracted detail results and falls back to the detail hash when needed", async () => {
    globalThis.chrome = {
      scripting: {
        executeScript: vi.fn().mockResolvedValue([
          {
            result: {
              title: " Episode 01 ",
              hash: "",
              magnetUrl: "magnet:?xt=urn:btih:ABCDEF123456",
              torrentUrl: "",
              magnetLabel: "磁力链接",
              downloadLabel: ""
            }
          }
        ])
      }
    } as unknown as typeof chrome

    withDetailTab.mockImplementation(async (_detailUrl, _timeoutMs, run) => run(41))

    await expect(
      kisssubSourceAdapter.extractSingleItem(
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          title: "Episode 01"
        },
        {
          ...DEFAULT_SETTINGS,
          retryCount: 0,
          injectTimeoutMs: 3000
        }
      )
    ).resolves.toEqual({
      ok: true,
      title: "Episode 01",
      detailUrl: "https://www.kisssub.org/show-deadbeef.html",
      hash: "deadbeef",
      magnetUrl: "magnet:?xt=urn:btih:ABCDEF123456",
      torrentUrl: "",
      failureReason: ""
    })

    expect(withDetailTab).toHaveBeenCalledWith(
      "https://www.kisssub.org/show-deadbeef.html",
      10000,
      expect.any(Function)
    )
  })

  it("retries extraction failures and returns the last failure when all attempts fail", async () => {
    withDetailTab.mockRejectedValue(new Error("helper failed"))

    await expect(
      kisssubSourceAdapter.extractSingleItem(
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-feedface.html",
          title: "Episode 02"
        },
        {
          ...DEFAULT_SETTINGS,
          retryCount: 2
        }
      )
    ).resolves.toEqual({
      ok: false,
      title: "Episode 02",
      detailUrl: "https://www.kisssub.org/show-feedface.html",
      hash: "feedface",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "helper failed"
    })

    expect(withDetailTab).toHaveBeenCalledTimes(3)
  })

  it("reloads wormhole pages after priming the helper cookies and then extracts the real links", async () => {
    const executeScript = vi
      .fn()
      .mockResolvedValueOnce([
        {
          result: {
            title: "Episode 03",
            hash: "cafebabe",
            magnetUrl: "",
            torrentUrl: "",
            magnetLabel: "开启虫洞",
            downloadLabel: "开启虫洞"
          }
        }
      ])
      .mockResolvedValueOnce([
        {
          result: {
            title: " Episode 03 ",
            hash: "",
            magnetUrl: "magnet:?xt=urn:btih:ABCDEF123456",
            torrentUrl: "",
            magnetLabel: "磁力链接",
            downloadLabel: ""
          }
        }
      ])

    globalThis.chrome = {
      scripting: {
        executeScript
      }
    } as unknown as typeof chrome

    withDetailTab.mockImplementation(async (_detailUrl, _timeoutMs, run) => run(64))
    reloadDetailTab.mockResolvedValue(undefined)

    await expect(
      kisssubSourceAdapter.extractSingleItem(
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-cafebabe.html",
          title: "Episode 03"
        },
        {
          ...DEFAULT_SETTINGS,
          retryCount: 0,
          injectTimeoutMs: 3000
        }
      )
    ).resolves.toEqual({
      ok: true,
      title: "Episode 03",
      detailUrl: "https://www.kisssub.org/show-cafebabe.html",
      hash: "cafebabe",
      magnetUrl: "magnet:?xt=urn:btih:ABCDEF123456",
      torrentUrl: "",
      failureReason: ""
    })

    expect(reloadDetailTab).toHaveBeenCalledWith(64, 10000)
    expect(executeScript).toHaveBeenCalledTimes(2)
    expect(executeScript).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        target: { tabId: 64 },
        world: "MAIN"
      })
    )
    expect(executeScript).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        target: { tabId: 64 },
        world: "MAIN"
      })
    )
  })
})
