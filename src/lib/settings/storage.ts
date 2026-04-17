import type { AppSettings } from "../shared/types"
import { getBrowser } from "../shared/browser"
import { DEFAULT_SETTINGS } from "./defaults"
import { mergeSettings } from "./merge"
import { sanitizeSettings } from "./sanitize"

type RawSettings = Record<string, unknown>
const APP_SETTINGS_STORAGE_KEY = "app_settings_v1"

export async function ensureSettings(): Promise<void> {
  const extensionBrowser = getBrowser()
  const stored = await extensionBrowser.storage.local.get(APP_SETTINGS_STORAGE_KEY)
  if (!stored[APP_SETTINGS_STORAGE_KEY]) {
    await extensionBrowser.storage.local.set({ [APP_SETTINGS_STORAGE_KEY]: DEFAULT_SETTINGS })
  }
}

export async function getSettings(): Promise<AppSettings> {
  await ensureSettings()
  const stored = await getBrowser().storage.local.get(APP_SETTINGS_STORAGE_KEY)
  return sanitizeSettings({
    ...DEFAULT_SETTINGS,
    ...(stored[APP_SETTINGS_STORAGE_KEY] ?? {})
  })
}

export async function saveSettings(partialSettings: RawSettings): Promise<AppSettings> {
  const merged = sanitizeSettings(mergeSettings(await getSettings(), partialSettings))

  await getBrowser().storage.local.set({ [APP_SETTINGS_STORAGE_KEY]: merged })
  return merged
}
