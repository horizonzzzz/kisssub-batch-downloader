import { describe, expect, it, vi, beforeEach } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { buildContentScriptState } from "../../../src/lib/background/queries/content-script-state"
import { getFilterConfig } from "../../../src/lib/filter-rules/storage"
import { getSourceConfig } from "../../../src/lib/sources/config/storage"
import { getBatchUiPreferences } from "../../../src/lib/batch-preferences/storage"

vi.mock("../../../src/lib/shared/browser", () => ({
  getBrowser: () => fakeBrowser
}))

vi.mock("../../../src/lib/filter-rules/storage", () => ({
  getFilterConfig: vi.fn()
}))

vi.mock("../../../src/lib/sources/config/storage", () => ({
  getSourceConfig: vi.fn()
}))

vi.mock("../../../src/lib/batch-preferences/storage", () => ({
  getBatchUiPreferences: vi.fn()
}))

describe("content script state query", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    fakeBrowser.storage.local.clear()

    vi.mocked(getSourceConfig).mockResolvedValue({
      kisssub: { enabled: true, deliveryMode: "magnet", script: { url: "//1.acgscript.com/script/miobt/4.js?3", revision: "20181120.2" } },
      dongmanhuayuan: { enabled: true, deliveryMode: "magnet" },
      acgrip: { enabled: true, deliveryMode: "torrent-file" },
      bangumimoe: { enabled: true, deliveryMode: "magnet" }
    })
    vi.mocked(getFilterConfig).mockResolvedValue({ rules: [] })
    vi.mocked(getBatchUiPreferences).mockResolvedValue({ lastSavePath: "" })
  })

  it("builds content-script state from source config, filter config, and batch preferences", async () => {
    await expect(buildContentScriptState({
      sourceId: "kisssub"
    })).resolves.toEqual({
      enabled: true,
      filters: [],
      lastSavePath: ""
    })
  })

  it("returns enabled false when source is disabled in config", async () => {
    vi.mocked(getSourceConfig).mockResolvedValue({
      kisssub: { enabled: false, deliveryMode: "magnet", script: { url: "//1.acgscript.com/script/miobt/4.js?3", revision: "20181120.2" } },
      dongmanhuayuan: { enabled: true, deliveryMode: "magnet" },
      acgrip: { enabled: true, deliveryMode: "torrent-file" },
      bangumimoe: { enabled: true, deliveryMode: "magnet" }
    })

    await expect(buildContentScriptState({
      sourceId: "kisssub"
    })).resolves.toEqual({
      enabled: false,
      filters: [],
      lastSavePath: ""
    })
  })

  it("includes filters from filter config", async () => {
    vi.mocked(getFilterConfig).mockResolvedValue({
      rules: [
        {
          id: "filter-1",
          name: "Test Filter",
          enabled: true,
          sourceIds: ["kisssub"],
          must: [{ id: "cond-1", field: "title", operator: "contains", value: "1080" }],
          any: []
        }
      ]
    })

    const state = await buildContentScriptState({ sourceId: "kisssub" })

    expect(state.filters).toHaveLength(1)
    expect(state.filters[0].name).toBe("Test Filter")
  })

  it("includes lastSavePath from batch ui preferences", async () => {
    vi.mocked(getBatchUiPreferences).mockResolvedValue({
      lastSavePath: "D:\\Anime\\Downloads"
    })

    const state = await buildContentScriptState({ sourceId: "kisssub" })

    expect(state.lastSavePath).toBe("D:\\Anime\\Downloads")
  })

  it("queries all three domain stores in parallel", async () => {
    await buildContentScriptState({ sourceId: "kisssub" })

    expect(getSourceConfig).toHaveBeenCalledTimes(1)
    expect(getFilterConfig).toHaveBeenCalledTimes(1)
    expect(getBatchUiPreferences).toHaveBeenCalledTimes(1)
  })
})