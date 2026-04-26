import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_BATCH_EXECUTION_CONFIG } from "../../../src/lib/batch-config/defaults"
import { kisssubSourceAdapter } from "../../../src/lib/sources/kisssub"
import type { ExtractionContext } from "../../../src/lib/sources/types"

const { reloadDetailTab, withDetailTab } = vi.hoisted(() => ({
  withDetailTab: vi.fn(),
  reloadDetailTab: vi.fn()
}))

vi.mock("../../../src/lib/sources/detail-tab", () => ({
  withDetailTab,
  reloadDetailTab
}))

function buildTestExtractionContext(overrides: Partial<ExtractionContext> = {}): ExtractionContext {
  return {
    execution: {
      retryCount: DEFAULT_BATCH_EXECUTION_CONFIG.retryCount,
      injectTimeoutMs: DEFAULT_BATCH_EXECUTION_CONFIG.injectTimeoutMs,
      domSettleMs: DEFAULT_BATCH_EXECUTION_CONFIG.domSettleMs
    },
    ...overrides
  }
}

describe("kisssubSourceAdapter", () => {
  beforeEach(() => {
    document.body.innerHTML = ""
    withDetailTab.mockReset()
    reloadDetailTab.mockReset()
  })

  it("matches supported list pages and rejects detail, addon, and user pages", () => {
    expect(kisssubSourceAdapter.matchesListPage(new URL("https://www.kisssub.org/list-test.html"))).toBe(true)
    expect(kisssubSourceAdapter.matchesListPage(new URL("https://www.kisssub.org/public/html/start/"))).toBe(false)
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
        buildTestExtractionContext({
          execution: {
            retryCount: 0,
            injectTimeoutMs: 3000,
            domSettleMs: DEFAULT_BATCH_EXECUTION_CONFIG.domSettleMs
          }
        })
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
        buildTestExtractionContext({
          execution: {
            retryCount: 2,
            injectTimeoutMs: DEFAULT_BATCH_EXECUTION_CONFIG.injectTimeoutMs,
            domSettleMs: DEFAULT_BATCH_EXECUTION_CONFIG.domSettleMs
          }
        })
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

  it("builds real links from Config when the page still shows wormhole anchors", async () => {
    const executeScript = vi.fn(async ({ func, args = [] }) => [
      {
        result: await func(...args)
      }
    ])

    globalThis.chrome = {
      scripting: {
        executeScript
      }
    } as unknown as typeof chrome

    withDetailTab.mockImplementation(async (_detailUrl, _timeoutMs, run) => {
      document.title = "Episode 03 - 爱恋动漫 cafebabe"
      document.body.innerHTML = `
        <a id="magnet" href="./addon.php?r=document/view&page=mika-mode">开启虫洞</a>
        <a id="download" href="./addon.php?r=document/view&page=mika-mode">开启虫洞</a>
      `
      ;(window as unknown as { Config: Record<string, unknown> }).Config = {
        in_script: "show",
        hash_id: "cafebabe",
        bt_data_title: "Episode 03",
        announce: "http://open.acgtracker.com:1096/announce",
        down_torrent_format: "[kisssub.org]%s"
      }
      window.history.replaceState({}, "", "/show-cafebabe.html")

      return run(64)
    })

    await expect(
      kisssubSourceAdapter.extractSingleItem(
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-cafebabe.html",
          title: "Episode 03"
        },
        buildTestExtractionContext({
          execution: {
            retryCount: 0,
            injectTimeoutMs: 3000,
            domSettleMs: DEFAULT_BATCH_EXECUTION_CONFIG.domSettleMs
          }
        })
      )
    ).resolves.toMatchObject({
      ok: true,
      title: "Episode 03",
      detailUrl: "https://www.kisssub.org/show-cafebabe.html",
      hash: "cafebabe",
      magnetUrl: "magnet:?xt=urn:btih:cafebabe&tr=http://open.acgtracker.com:1096/announce",
      torrentUrl: "https://v2.uploadbt.com/?r=down&hash=cafebabe&name=%5Bkisssub.org%5DEpisode%2003",
      failureReason: ""
    })

    expect(reloadDetailTab).not.toHaveBeenCalled()
    expect(executeScript).toHaveBeenCalledTimes(1)
    expect(executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { tabId: 64 },
        world: "MAIN"
      })
    )
  })

  it("keeps an existing magnet while constructing the torrent URL from Config", async () => {
    globalThis.chrome = {
      scripting: {
        executeScript: vi.fn(async ({ func, args = [] }) => [{ result: await func(...args) }])
      }
    } as unknown as typeof chrome

    withDetailTab.mockImplementation(async (_detailUrl, _timeoutMs, run) => {
      document.title = "Episode 04 - 爱恋动漫 deadbeef"
      document.body.innerHTML = `
        <a id="magnet" href="magnet:?xt=urn:btih:deadbeef">磁链下载</a>
        <a id="download" href="./addon.php?r=document/view&page=mika-mode">开启虫洞</a>
      `
      ;(window as unknown as { Config: Record<string, unknown> }).Config = {
        in_script: "show",
        hash_id: "deadbeef",
        bt_data_title: "Episode 04",
        down_torrent_format: "[kisssub.org]%s"
      }
      window.history.replaceState({}, "", "/show-deadbeef.html")

      return run(74)
    })

    await expect(
      kisssubSourceAdapter.extractSingleItem(
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          title: "Episode 04"
        },
        buildTestExtractionContext({
          execution: {
            retryCount: 0,
            injectTimeoutMs: 3000,
            domSettleMs: DEFAULT_BATCH_EXECUTION_CONFIG.domSettleMs
          }
        })
      )
    ).resolves.toMatchObject({
      ok: true,
      hash: "deadbeef",
      magnetUrl: "magnet:?xt=urn:btih:deadbeef",
      torrentUrl: "https://v2.uploadbt.com/?r=down&hash=deadbeef&name=%5Bkisssub.org%5DEpisode%2004"
    })
  })
})
