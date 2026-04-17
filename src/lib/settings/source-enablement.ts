import { SOURCE_IDS } from "../sources/catalog"
import type { AppSettings, SourceId } from "../shared/types"

export const DEFAULT_ENABLED_SOURCES: Record<SourceId, boolean> = Object.freeze({
  kisssub: true,
  dongmanhuayuan: true,
  acgrip: true,
  bangumimoe: true
})

export function normalizeEnabledSources(raw: unknown): AppSettings["enabledSources"] {
  const record = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {}
  const normalized: AppSettings["enabledSources"] = {}

  for (const sourceId of SOURCE_IDS) {
    normalized[sourceId] =
      typeof record[sourceId] === "boolean"
        ? (record[sourceId] as boolean)
        : DEFAULT_ENABLED_SOURCES[sourceId]
  }

  return normalized
}

export function resolveSourceEnabled(
  sourceId: SourceId,
  settings: Pick<AppSettings, "enabledSources">
): boolean {
  return typeof settings.enabledSources?.[sourceId] === "boolean"
    ? Boolean(settings.enabledSources[sourceId])
    : DEFAULT_ENABLED_SOURCES[sourceId]
}

export function getDisabledSources(
  sourceIds: SourceId[],
  settings: Pick<AppSettings, "enabledSources">
): SourceId[] {
  return sourceIds.filter((sourceId) => !resolveSourceEnabled(sourceId, settings))
}
