import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_BATCH_EXECUTION_CONFIG } from "../../../src/lib/batch-config/defaults"
import { DEFAULT_SOURCE_CONFIG } from "../../../src/lib/sources/config/defaults"
import type { ExtractionContext } from "../../../src/lib/sources/types"

const getSourceAdapterById = vi.fn()

vi.mock("../../../src/lib/sources", () => ({
  getSourceAdapterById
}))

function createExtractionContext(): ExtractionContext {
  return {
    execution: {
      retryCount: DEFAULT_BATCH_EXECUTION_CONFIG.retryCount,
      injectTimeoutMs: DEFAULT_BATCH_EXECUTION_CONFIG.injectTimeoutMs,
      domSettleMs: DEFAULT_BATCH_EXECUTION_CONFIG.domSettleMs
    }
  }
}

describe("extractSingleItem", () => {
  beforeEach(() => {
    getSourceAdapterById.mockReset()
  })

  it("returns an actionable failure for unsupported sources", async () => {
    getSourceAdapterById.mockReturnValue(null)

    const { extractSingleItem } = await import("../../../src/lib/sources/extraction")

    await expect(
      extractSingleItem(
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          title: "Episode 01"
        },
        createExtractionContext()
      )
    ).resolves.toEqual({
      ok: false,
      title: "Episode 01",
      detailUrl: "https://www.kisssub.org/show-deadbeef.html",
      hash: "",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "Unsupported source adapter: kisssub"
    })
  })

  it("delegates extraction to the matched source adapter", async () => {
    const extract = vi.fn().mockResolvedValue({
      ok: true,
      title: "Episode 01",
      detailUrl: "https://www.kisssub.org/show-deadbeef.html",
      hash: "deadbeef",
      magnetUrl: "magnet:?xt=urn:btih:deadbeef",
      torrentUrl: "",
      failureReason: ""
    })
    getSourceAdapterById.mockReturnValue({
      extractSingleItem: extract
    })

    const { extractSingleItem } = await import("../../../src/lib/sources/extraction")
    const context = createExtractionContext()
    const item = {
      sourceId: "kisssub" as const,
      detailUrl: "https://www.kisssub.org/show-deadbeef.html",
      title: "Episode 01"
    }

    await expect(extractSingleItem(item, context)).resolves.toMatchObject({
      ok: true,
      hash: "deadbeef"
    })
    expect(extract).toHaveBeenCalledWith(item, context)
  })
})