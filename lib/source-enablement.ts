import { DEFAULT_ENABLED_SOURCES, SOURCE_IDS } from "./source-config"
import type { Settings, SourceId } from "./types"

export function normalizeEnabledSources(raw: unknown): Settings["enabledSources"] {
  const record = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {}
  const normalized: Settings["enabledSources"] = {}

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
  settings: Pick<Settings, "enabledSources">
): boolean {
  return typeof settings.enabledSources?.[sourceId] === "boolean"
    ? Boolean(settings.enabledSources[sourceId])
    : DEFAULT_ENABLED_SOURCES[sourceId]
}

export function getDisabledSources(
  sourceIds: SourceId[],
  settings: Pick<Settings, "enabledSources">
): SourceId[] {
  return sourceIds.filter((sourceId) => !resolveSourceEnabled(sourceId, settings))
}
