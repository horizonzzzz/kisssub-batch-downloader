import { loginQb, qbFetchText } from "../downloader/qb"
import { getSettings, sanitizeSettings } from "../settings"
import type { Settings, TestQbConnectionResult } from "../shared/types"

export async function testQbConnection(
  overrideSettings: Partial<Settings> | null
): Promise<TestQbConnectionResult> {
  const settings = sanitizeSettings({
    ...(await getSettings()),
    ...(overrideSettings ?? {})
  })

  await loginQb(settings)
  const version = await qbFetchText(settings, "/api/v2/app/version", { method: "GET" })

  return {
    baseUrl: settings.qbBaseUrl,
    version: version.trim() || "unknown"
  }
}
