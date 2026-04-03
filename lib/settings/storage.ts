import type { Settings } from "../shared/types"
import { DEFAULT_SETTINGS } from "./defaults"
import { sanitizeSettings } from "./sanitize"

type RawSettings = Partial<Settings> & Record<string, unknown>
const SETTINGS_STORAGE_KEY = "settings_v2"

export async function ensureSettings(): Promise<void> {
  const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY)
  if (!stored[SETTINGS_STORAGE_KEY]) {
    await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS })
  }
}

export async function getSettings(): Promise<Settings> {
  await ensureSettings()
  const stored = await chrome.storage.local.get(SETTINGS_STORAGE_KEY)
  return sanitizeSettings({
    ...DEFAULT_SETTINGS,
    ...(stored[SETTINGS_STORAGE_KEY] ?? {})
  })
}

export async function saveSettings(partialSettings: RawSettings): Promise<Settings> {
  const merged = sanitizeSettings({
    ...(await getSettings()),
    ...(partialSettings ?? {})
  })

  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: merged })
  return merged
}
