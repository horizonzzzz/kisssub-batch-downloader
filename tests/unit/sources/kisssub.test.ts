import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "../../../src/lib/settings"
import { DEFAULT_SOURCE_CONFIG } from "../../../src/lib/sources/config/defaults"
import { kisssubSourceAdapter, parseKisssubDetailSnapshot } from "../../../src/lib/sources/kisssub"
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
      retryCount: DEFAULT_SETTINGS.retryCount,
      injectTimeoutMs: DEFAULT_SETTINGS.injectTimeoutMs,
      domSettleMs: DEFAULT_SETTINGS.domSettleMs
    },
    source: {
      kisssub: {
        script: DEFAULT_SOURCE_CONFIG.kisssub.script
      }
    },
    ...overrides
  }
}

describe("parseKisssubDetailSnapshot", () => {
  it("returns the extracted magnet or torrent URLs when the detail page exposes them", () => {
    expect(
      parseKisssubDetailSnapshot({
        title: " Episode 01 ",
        hash: "deadbeef",
        magnetUrl: "magnet:?xt=urn:btih:ABCDEF123456",
        torrentUrl: "https://www.kisssub.org/download/deadbeef.torrent",
        magnetLabel: "磁力链接",
        downloadLabel: "本地下载"
      })
    ).toEqual({
      ok: true,
      title: "Episode 01",
      hash: "deadbeef",
      magnetUrl: "magnet:?xt=urn:btih:ABCDEF123456",
      torrentUrl: "https://www.kisssub.org/download/deadbeef.torrent",
      failureReason: ""
    })
  })

  it("returns a helper timeout failure when the wormhole links never resolve", () => {
    expect(
      parseKisssubDetailSnapshot({
        title: "Episode 02",
        hash: "feedface",
        magnetUrl: "",
        torrentUrl: "",
        magnetLabel: "开启虫洞",
        downloadLabel: "开启虫洞"
      })
    ).toEqual({
      ok: false,
      title: "Episode 02",
      hash: "feedface",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "The helper script timed out and the detail buttons still point to the wormhole page."
    })
  })

  it("returns a generic extraction failure when no usable URLs are exposed", () => {
    expect(
      parseKisssubDetailSnapshot({
        title: "Episode 03",
        hash: "cafebabe",
        magnetUrl: "",
        torrentUrl: "",
        magnetLabel: "",
        downloadLabel: ""
      })
    ).toEqual({
      ok: false,
      title: "Episode 03",
      hash: "cafebabe",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "The detail page finished loading, but no usable magnet or torrent URL was exposed."
    })
  })
})

describe("kisssubSourceAdapter detail title fallback", () => {
  beforeEach(() => {
    document.title = ""
    document.body.innerHTML = ""
    withDetailTab.mockReset()
    reloadDetailTab.mockReset()
  })

  it("uses the document title when the navigation breadcrumb is absent", async () => {
    withDetailTab.mockImplementation(async (_detailUrl, _timeoutMs, run) => {
      document.title = "[SweetSub][刹那之花] - 爱恋动漫 deadbeef"
      document.body.innerHTML = `
        <a id="magnet" href="./addon.php?r=document/view&page=mika-mode">开启虫洞</a>
        <a id="download" href="./addon.php?r=document/view&page=mika-mode">开启虫洞</a>
      `
      window.history.replaceState({}, "", "/show-deadbeef.html")

      globalThis.chrome = {
        scripting: {
          executeScript: vi.fn(async ({ func, args = [] }) => [{ result: await func(...args) }])
        }
      } as unknown as typeof chrome

      return run(1)
    })

    await expect(
      kisssubSourceAdapter.extractSingleItem(
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          title: "placeholder"
        },
        buildTestExtractionContext({
          execution: {
            retryCount: 0,
            injectTimeoutMs: 10,
            domSettleMs: 0
          }
        })
      )
    ).resolves.toMatchObject({
      title: "[SweetSub][刹那之花]"
    })
  })

  it("strips the live site suffix from document.title", async () => {
    withDetailTab.mockImplementation(async (_detailUrl, _timeoutMs, run) => {
      document.title = "[爱恋字幕社][示例资源] - 爱恋动漫 deadbeef"
      document.body.innerHTML = `
        <a id="magnet" href="magnet:?xt=urn:btih:abcdef1234567890">磁力链接</a>
        <a id="download" href="/download/example.torrent">下载种子</a>
      `
      window.history.replaceState({}, "", "/show-deadbeef.html")

      globalThis.chrome = {
        scripting: {
          executeScript: vi.fn(async ({ func, args = [] }) => [{ result: await func(...args) }])
        }
      } as unknown as typeof chrome

      return run(1)
    })

    await expect(
      kisssubSourceAdapter.extractSingleItem(
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          title: "placeholder"
        },
        buildTestExtractionContext({
          execution: {
            retryCount: 0,
            injectTimeoutMs: 10,
            domSettleMs: 0
          }
        })
      )
    ).resolves.toMatchObject({
      title: "[爱恋字幕社][示例资源]"
    })
  })

  it("prefers an in-page heading before the document title fallback", async () => {
    withDetailTab.mockImplementation(async (_detailUrl, _timeoutMs, run) => {
      document.title = "示例资源 - 爱恋动漫 deadbeef"
      document.body.innerHTML = `
        <h1>[爱恋字幕社][示例资源]</h1>
        <a id="magnet" href="magnet:?xt=urn:btih:abcdef1234567890">磁力链接</a>
        <a id="download" href="/download/example.torrent">下载种子</a>
      `
      window.history.replaceState({}, "", "/show-deadbeef.html")

      globalThis.chrome = {
        scripting: {
          executeScript: vi.fn(async ({ func, args = [] }) => [{ result: await func(...args) }])
        }
      } as unknown as typeof chrome

      return run(1)
    })

    await expect(
      kisssubSourceAdapter.extractSingleItem(
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          title: "placeholder"
        },
        buildTestExtractionContext({
          execution: {
            retryCount: 0,
            injectTimeoutMs: 10,
            domSettleMs: 0
          }
        })
      )
    ).resolves.toMatchObject({
      title: "[爱恋字幕社][示例资源]"
    })
  })
})