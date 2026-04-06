import { beforeEach, describe, expect, it, vi } from "vitest"

import { CONTENT_SCRIPT_MATCH_PATTERNS } from "../../../src/lib/sources/matching"

const defineContentScriptMock = vi.fn((definition) => definition)
const startSourceBatchContentScriptMock = vi.fn()

vi.mock("wxt/utils/define-content-script", () => ({
  defineContentScript: defineContentScriptMock
}))

vi.mock("../../../src/entrypoints/source-batch.content/runtime", () => ({
  startSourceBatchContentScript: startSourceBatchContentScriptMock
}))

describe("WXT content script entrypoint", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("exports the supported source matches through defineContentScript", async () => {
    const module = await import("../../../src/entrypoints/source-batch.content/index")

    expect(defineContentScriptMock).toHaveBeenCalledTimes(1)
    expect(module.default).toMatchObject({
      matches: CONTENT_SCRIPT_MATCH_PATTERNS,
      runAt: "document_idle",
      cssInjectionMode: "ui"
    })
  })

  it("delegates runtime startup to the source batch bootstrap", async () => {
    const module = await import("../../../src/entrypoints/source-batch.content/index")
    const ctx = { contentScriptName: "source-batch" } as never

    await module.default.main(ctx)

    expect(startSourceBatchContentScriptMock).toHaveBeenCalledTimes(1)
    expect(startSourceBatchContentScriptMock).toHaveBeenCalledWith(ctx)
  })
})
