import { getBrowser } from "../shared/browser"
import { DEFAULT_BATCH_UI_PREFERENCES } from "./defaults"
import type { BatchUiPreferences } from "./types"

const BATCH_UI_PREFERENCES_STORAGE_KEY = "batch_ui_preferences"

export function normalizeSavePath(savePath: string | undefined): string {
  if (!savePath) {
    return ""
  }
  return String(savePath).trim()
}

export async function getBatchUiPreferences(): Promise<BatchUiPreferences> {
  const extensionBrowser = getBrowser()
  const stored = await extensionBrowser.storage.local.get(BATCH_UI_PREFERENCES_STORAGE_KEY)

  if (stored[BATCH_UI_PREFERENCES_STORAGE_KEY]) {
    try {
      return {
        lastSavePath: String(
          (stored[BATCH_UI_PREFERENCES_STORAGE_KEY] as BatchUiPreferences).lastSavePath ?? ""
        ).trim()
      }
    } catch {
      await extensionBrowser.storage.local.set({
        [BATCH_UI_PREFERENCES_STORAGE_KEY]: DEFAULT_BATCH_UI_PREFERENCES
      })
      return DEFAULT_BATCH_UI_PREFERENCES
    }
  }

  await extensionBrowser.storage.local.set({
    [BATCH_UI_PREFERENCES_STORAGE_KEY]: DEFAULT_BATCH_UI_PREFERENCES
  })
  return DEFAULT_BATCH_UI_PREFERENCES
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
