import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_BATCH_EXECUTION_CONFIG } from "../../../src/lib/batch-config/defaults"
import {
  dongmanhuayuanSourceAdapter,
  parseDongmanhuayuanDetailSnapshot
} from "../../../src/lib/sources/dongmanhuayuan"
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
    ...overrides
  }
}

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

  it("handles site header title fallback when main area title is unavailable", () => {
    expect(
      parseDongmanhuayuanDetailSnapshot(
        {
          title: "",
          magnetCandidates: ["magnet:?xt=urn:btih:ABCD1234567890ABCDEF1234567890ABCDEF12"]
        },
        "https://www.dongmanhuayuan.com/detail/TEST12.html"
      )
    ).toEqual({
      ok: true,
      title: "",
      hash: "abcd1234567890abcdef1234567890abcdef12",
      magnetUrl: "magnet:?xt=urn:btih:ABCD1234567890ABCDEF1234567890ABCDEF12",
      torrentUrl: "",
      failureReason: ""
    })
  })
})

describe("dongmanhuayuanSourceAdapter", () => {
  beforeEach(() => {
    document.title = ""
    document.body.innerHTML = ""
    withDetailTab.mockReset()
  })

  it("falls back to a page h1 when the page has no main element", async () => {
    withDetailTab.mockImplementation(async (_detailUrl, _timeoutMs, run) => {
      document.title = "动漫花园"
      document.body.innerHTML = `
        <h1>动漫花园</h1>
        <section>
          <h1>[爱恋字幕社][新番][示例标题]</h1>
          <input value="magnet:?xt=urn:btih:abcdef1234567890" />
        </section>
      `

      globalThis.chrome = {
        scripting: {
          executeScript: vi.fn(async ({ func, args = [] }) => [{ result: await func(...args) }])
        }
      } as unknown as typeof chrome

      return run(1)
    })

    await expect(
      dongmanhuayuanSourceAdapter.extractSingleItem(
        {
          sourceId: "dongmanhuayuan",
          detailUrl: "https://www.dongmanhuayuan.com/detail/TEST12.html",
          title: "placeholder"
        },
        buildTestExtractionContext({
          execution: {
            retryCount: 0,
            injectTimeoutMs: DEFAULT_BATCH_EXECUTION_CONFIG.injectTimeoutMs,
            domSettleMs: DEFAULT_BATCH_EXECUTION_CONFIG.domSettleMs
          }
        })
      )
    ).resolves.toMatchObject({
      title: "[爱恋字幕社][新番][示例标题]",
      magnetUrl: "magnet:?xt=urn:btih:abcdef1234567890"
    })
  })

  it("ignores the container site heading and keeps the resource h1 on live-like pages", async () => {
    withDetailTab.mockImplementation(async (_detailUrl, _timeoutMs, run) => {
      document.title = "[SweetSub][刹那之花][Momentary Lily][01-14 精校合集]_动漫花园磁力链接/电驴/迅雷下载"
      document.body.innerHTML = `
        <div class="container">
          <h1>动漫花园</h1>
          <section>
            <h1>[SweetSub][刹那之花][Momentary Lily][01-14 精校合集]</h1>
          </section>
          <input value="magnet:?xt=urn:btih:abcdef1234567890abcdef1234567890abcdef12" />
        </div>
      `

      globalThis.chrome = {
        scripting: {
          executeScript: vi.fn(async ({ func, args = [] }) => [{ result: await func(...args) }])
        }
      } as unknown as typeof chrome

      return run(1)
    })

    await expect(
      dongmanhuayuanSourceAdapter.extractSingleItem(
        {
          sourceId: "dongmanhuayuan",
          detailUrl: "https://www.dongmanhuayuan.com/detail/TEST12.html",
          title: "placeholder"
        },
        buildTestExtractionContext({
          execution: {
            retryCount: 0,
            injectTimeoutMs: DEFAULT_BATCH_EXECUTION_CONFIG.injectTimeoutMs,
            domSettleMs: DEFAULT_BATCH_EXECUTION_CONFIG.domSettleMs
          }
        })
      )
    ).resolves.toMatchObject({
      title: "[SweetSub][刹那之花][Momentary Lily][01-14 精校合集]",
      magnetUrl: "magnet:?xt=urn:btih:abcdef1234567890abcdef1234567890abcdef12"
    })
  })

  it("falls back to document title when no resource heading exists", async () => {
    withDetailTab.mockImplementation(async (_detailUrl, _timeoutMs, run) => {
      document.title = "[爱恋字幕社][新番][示例标题]_动漫花园磁力链接/电驴/迅雷下载"
      document.body.innerHTML = `<input value="magnet:?xt=urn:btih:abcdef1234567890" />`

      globalThis.chrome = {
        scripting: {
          executeScript: vi.fn(async ({ func, args = [] }) => [{ result: await func(...args) }])
        }
      } as unknown as typeof chrome

      return run(1)
    })

    await expect(
      dongmanhuayuanSourceAdapter.extractSingleItem(
        {
          sourceId: "dongmanhuayuan",
          detailUrl: "https://www.dongmanhuayuan.com/detail/TEST12.html",
          title: "placeholder"
        },
        buildTestExtractionContext({
          execution: {
            retryCount: 0,
            injectTimeoutMs: DEFAULT_BATCH_EXECUTION_CONFIG.injectTimeoutMs,
            domSettleMs: DEFAULT_BATCH_EXECUTION_CONFIG.domSettleMs
          }
        })
      )
    ).resolves.toMatchObject({
      title: "[爱恋字幕社][新番][示例标题]"
    })
  })
})