import type { Settings } from "../shared/types"
import { DEFAULT_SETTINGS } from "./defaults"
import { sanitizeSettings } from "./sanitize"

type RawSettings = Partial<Settings> & Record<string, unknown>

export async function ensureSettings(): Promise<void> {
  const stored = await chrome.storage.local.get("settings")
  if (!stored.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS })
  }
}

export async function getSettings(): Promise<Settings> {
  await ensureSettings()
  const stored = await chrome.storage.local.get("settings")
  return sanitizeSettings({
    ...DEFAULT_SETTINGS,
    ...(stored.settings ?? {})
  })
}

export async function saveSettings(partialSettings: RawSettings): Promise<Settings> {
  const merged = sanitizeSettings({
    ...(await getSettings()),
    ...(partialSettings ?? {})
  })

  await chrome.storage.local.set({ settings: merged })
  return merged
}
