import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_BATCH_EXECUTION_CONFIG } from "../../../src/lib/batch-config/defaults"
import { acgRipSourceAdapter, parseAcgRipDetailSnapshot } from "../../../src/lib/sources/acgrip"
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

describe("parseAcgRipDetailSnapshot", () => {
  it("returns the torrent URL exposed on the detail page", () => {
    expect(
      parseAcgRipDetailSnapshot(
        {
          title: "[LoliHouse] Hell Mode - 11",
          torrentUrl: "https://acg.rip/t/350361.torrent"
        },
        "https://acg.rip/t/350361"
      )
    ).toEqual({
      ok: true,
      title: "[LoliHouse] Hell Mode - 11",
      hash: "350361",
      magnetUrl: "",
      torrentUrl: "https://acg.rip/t/350361.torrent",
      failureReason: ""
    })
  })

  it("falls back to the detail id when no torrent URL is exposed", () => {
    expect(
      parseAcgRipDetailSnapshot(
        {
          title: "[LoliHouse] Hell Mode - 11",
          torrentUrl: ""
        },
        "https://acg.rip/t/350361"
      )
    ).toEqual({
      ok: false,
      title: "[LoliHouse] Hell Mode - 11",
      hash: "350361",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "The detail page finished loading, but no usable torrent URL was exposed."
    })
  })
})

describe("acgRipSourceAdapter", () => {
  beforeEach(() => {
    document.title = ""
    document.body.innerHTML = ""
    withDetailTab.mockReset()
  })

  it("prefers the post content heading over the generic side panel title", async () => {
    withDetailTab.mockImplementation(async (_detailUrl, _timeoutMs, run) => {
      document.body.innerHTML = `
        <div class="panel-title">种子信息</div>
        <div class="post-show-content">
          <div class="panel-heading">[SweetSub] Momentary Lily 01-14</div>
        </div>
        <a href="/t/350842.torrent">下载种子</a>
      `

      globalThis.chrome = {
        scripting: {
          executeScript: vi.fn(async ({ func, args = [] }) => [{ result: await func(...args) }])
        }
      } as unknown as typeof chrome

      return run(1)
    })

    await expect(
      acgRipSourceAdapter.extractSingleItem(
        {
          sourceId: "acgrip",
          detailUrl: "https://acg.rip/t/350842",
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
      ok: true,
      title: "[SweetSub] Momentary Lily 01-14",
      torrentUrl: expect.stringContaining("/t/350842.torrent")
    })
  })
})