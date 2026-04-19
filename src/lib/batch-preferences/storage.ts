import { getBrowser } from "../shared/browser"
import { DEFAULT_BATCH_UI_PREFERENCES } from "./defaults"
import type { BatchUiPreferences } from "./types"

const BATCH_UI_PREFERENCES_STORAGE_KEY = "batch_ui_preferences"

type LegacyAppSettings = {
  lastSavePath?: string
}

function migrateFromLegacySettings(legacy: LegacyAppSettings): BatchUiPreferences {
  const trimmedPath = String(legacy.lastSavePath ?? "").trim()
  return {
    lastSavePath: trimmedPath || DEFAULT_BATCH_UI_PREFERENCES.lastSavePath
  }
}

export async function getBatchUiPreferences(): Promise<BatchUiPreferences> {
  const extensionBrowser = getBrowser()
  const stored = await extensionBrowser.storage.local.get([
    BATCH_UI_PREFERENCES_STORAGE_KEY,
    "app_settings"
  ])

  // If batch_ui_preferences exists, use it directly
  if (stored[BATCH_UI_PREFERENCES_STORAGE_KEY]) {
    return {
      lastSavePath: String(
        (stored[BATCH_UI_PREFERENCES_STORAGE_KEY] as BatchUiPreferences).lastSavePath ?? ""
      ).trim()
    }
  }

  // Migration: read from legacy app_settings fields
  const legacySettings = (stored["app_settings"] as LegacyAppSettings | undefined) ?? {}
  const migratedPreferences = migrateFromLegacySettings(legacySettings)

  // Persist migrated preferences for future reads
  await extensionBrowser.storage.local.set({
    [BATCH_UI_PREFERENCES_STORAGE_KEY]: migratedPreferences
  })

  return migratedPreferences
}

export async function saveBatchUiPreferences(
  preferences: Partial<BatchUiPreferences>
): Promise<BatchUiPreferences> {
  const current = await getBatchUiPreferences()
  const merged: BatchUiPreferences = {
    lastSavePath: String(preferences.lastSavePath ?? current.lastSavePath).trim()
  }

  await getBrowser().storage.local.set({
    [BATCH_UI_PREFERENCES_STORAGE_KEY]: merged
  })

  return merged
}