import { describe, expect, it, vi, beforeEach } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { DEFAULT_BATCH_UI_PREFERENCES } from "../../../src/lib/batch-preferences/defaults"
import {
  getBatchUiPreferences,
  saveBatchUiPreferences
} from "../../../src/lib/batch-preferences/storage"

vi.mock("../../../src/lib/shared/browser", () => ({
  getBrowser: () => fakeBrowser
}))

describe("batch ui preferences storage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    fakeBrowser.storage.local.clear()
  })

  it("hydrates default ui preferences", async () => {
    await expect(getBatchUiPreferences()).resolves.toEqual(DEFAULT_BATCH_UI_PREFERENCES)
  })

  it("trims the last save path", async () => {
    await expect(
      saveBatchUiPreferences({
        lastSavePath: "  D:\\Anime\\Batch  "
      })
    ).resolves.toEqual({
      lastSavePath: "D:\\Anime\\Batch"
    })
  })

  it("persists ui preferences changes to dedicated storage key", async () => {
    const saved = await saveBatchUiPreferences({
      lastSavePath: "E:\\Downloads\\Anime"
    })

    expect(saved.lastSavePath).toBe("E:\\Downloads\\Anime")

    const stored = await fakeBrowser.storage.local.get("batch_ui_preferences")
    expect(stored.batch_ui_preferences).toEqual(saved)

    // Re-read to verify persistence
    const reRead = await getBatchUiPreferences()
    expect(reRead).toEqual(saved)
  })

  it("migrates from legacy app_settings lastSavePath field", async () => {
    await fakeBrowser.storage.local.set({
      app_settings: {
        lastSavePath: "C:\\Users\\Test\\Downloads"
      }
    })

    const preferences = await getBatchUiPreferences()

    expect(preferences.lastSavePath).toBe("C:\\Users\\Test\\Downloads")

    // Verify the migrated preferences is persisted for future reads
    const stored = await fakeBrowser.storage.local.get("batch_ui_preferences")
    expect(stored.batch_ui_preferences).toEqual(preferences)
  })

  it("uses batch_ui_preferences directly when it exists, ignoring legacy app_settings", async () => {
    // Set up both batch_ui_preferences and legacy app_settings
    await fakeBrowser.storage.local.set({
      batch_ui_preferences: {
        lastSavePath: "D:\\NewPath"
      },
      app_settings: {
        lastSavePath: "C:\\OldPath" // Should be ignored
      }
    })

    const preferences = await getBatchUiPreferences()

    // Should use batch_ui_preferences values, not legacy
    expect(preferences.lastSavePath).toBe("D:\\NewPath")
  })

  it("returns empty string when lastSavePath is missing in legacy", async () => {
    // Set up legacy app_settings without lastSavePath
    await fakeBrowser.storage.local.set({
      app_settings: {
        concurrency: 3 // Other fields, no lastSavePath
      }
    })

    const preferences = await getBatchUiPreferences()

    expect(preferences.lastSavePath).toBe("")
  })
})