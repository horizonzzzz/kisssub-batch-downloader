import type { Settings } from "../shared/types"
import { getBrowser } from "../shared/browser"
import { DEFAULT_SETTINGS } from "./defaults"
import { mergeSettings } from "./merge"
import { sanitizeSettings } from "./sanitize"

type RawSettings = Record<string, unknown>
const SETTINGS_STORAGE_KEY = "settings_v2"

export async function ensureSettings(): Promise<void> {
  const extensionBrowser = getBrowser()
  const stored = await extensionBrowser.storage.local.get(SETTINGS_STORAGE_KEY)
  if (!stored[SETTINGS_STORAGE_KEY]) {
    await extensionBrowser.storage.local.set({ [SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS })
  }
}

export async function getSettings(): Promise<Settings> {
  await ensureSettings()
  const stored = await getBrowser().storage.local.get(SETTINGS_STORAGE_KEY)
  return sanitizeSettings({
    ...DEFAULT_SETTINGS,
    ...(stored[SETTINGS_STORAGE_KEY] ?? {})
  })
}

export async function saveSettings(partialSettings: RawSettings): Promise<Settings> {
  const merged = sanitizeSettings(mergeSettings(await getSettings(), partialSettings))

  await getBrowser().storage.local.set({ [SETTINGS_STORAGE_KEY]: merged })
  return merged
}
