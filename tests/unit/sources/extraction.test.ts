import { beforeEach, describe, expect, it, vi } from "vitest"

const getSourceAdapterById = vi.fn()

vi.mock("../../../src/lib/sources", () => ({
  getSourceAdapterById
}))

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
        {} as never
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
    const settings = { retryCount: 1 } as never
    const item = {
      sourceId: "kisssub" as const,
      detailUrl: "https://www.kisssub.org/show-deadbeef.html",
      title: "Episode 01"
    }

    await expect(extractSingleItem(item, settings)).resolves.toMatchObject({
      ok: true,
      hash: "deadbeef"
    })
    expect(extract).toHaveBeenCalledWith(item, settings)
  })
})
