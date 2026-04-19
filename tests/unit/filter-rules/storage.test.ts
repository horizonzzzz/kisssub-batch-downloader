import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { DEFAULT_FILTER_CONFIG } from "../../../src/lib/filter-rules/defaults"
import {
  ensureFilterConfig,
  getFilterConfig,
  saveFilterConfig
} from "../../../src/lib/filter-rules/storage"

describe("filter config storage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fakeBrowser.storage.local.clear()
  })

  it("writes default filter config when storage is empty", async () => {
    await ensureFilterConfig()

    await expect(fakeBrowser.storage.local.get("filter_config")).resolves.toEqual({
      filter_config: DEFAULT_FILTER_CONFIG
    })
  })

  it("persists only filter rules under the filter storage key", async () => {
    await saveFilterConfig({
      rules: [
        {
          id: "filter-1",
          name: "ACG Medalist",
          enabled: true,
          sourceIds: ["acgrip"],
          must: [
            {
              id: "condition-1",
              field: "title",
              operator: "contains",
              value: "Medalist"
            }
          ],
          any: []
        }
      ]
    })

    await expect(getFilterConfig()).resolves.toEqual({
      rules: [
        expect.objectContaining({
          id: "filter-1",
          name: "ACG Medalist"
        })
      ]
    })
  })

  it("retrieves stored filter config without creating duplicates", async () => {
    await saveFilterConfig({
      rules: [
        {
          id: "filter-1",
          name: "First Rule",
          enabled: true,
          sourceIds: ["kisssub"],
          must: [
            {
              id: "condition-1",
              field: "title",
              operator: "contains",
              value: "1080"
            }
          ],
          any: []
        }
      ]
    })

    await ensureFilterConfig()

    const stored = await fakeBrowser.storage.local.get("filter_config")
    expect(stored.filter_config.rules).toHaveLength(1)
    expect(stored.filter_config.rules[0].name).toBe("First Rule")
  })

  it("returns default config when storage is empty on get", async () => {
    const config = await getFilterConfig()

    expect(config).toEqual(DEFAULT_FILTER_CONFIG)
  })

  it("sanitizes invalid filter entries during save", async () => {
    await saveFilterConfig({
      rules: [
        {
          id: "filter-1",
          name: "Valid Filter",
          enabled: true,
          sourceIds: ["kisssub"],
          must: [
            {
              id: "condition-1",
              field: "title",
              operator: "contains",
              value: "1080"
            }
          ],
          any: []
        },
        {
          id: "filter-2",
          name: "", // Invalid: empty name
          enabled: true,
          sourceIds: ["kisssub"],
          must: [
            {
              id: "condition-2",
              field: "title",
              operator: "contains",
              value: "720"
            }
          ],
          any: []
        }
      ]
    })

    const config = await getFilterConfig()
    expect(config.rules).toHaveLength(1)
    expect(config.rules[0].name).toBe("Valid Filter")
  })
})