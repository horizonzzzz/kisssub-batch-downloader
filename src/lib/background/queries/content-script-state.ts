import { getBatchUiPreferences } from "../../batch-preferences/storage"
import { getFilterConfig } from "../../filter-rules/storage"
import { getSourceConfig } from "../../sources/config/storage"
import { resolveSourceEnabled } from "../../sources/config/selectors"
import type { SourceId } from "../../shared/types"

export type ContentScriptState = {
  enabled: boolean
  filters: Array<{
    id: string
    name: string
    enabled: boolean
    sourceIds: SourceId[]
    must: Array<{
      id: string
      field: "title" | "subgroup"
      operator: "contains"
      value: string
    }>
    any: Array<{
      id: string
      field: "title" | "subgroup"
      operator: "contains"
      value: string
    }>
  }>
  lastSavePath: string
}

export async function buildContentScriptState({
  sourceId
}: {
  sourceId: SourceId
}): Promise<ContentScriptState> {
  const [sourceConfig, filterConfig, preferences] = await Promise.all([
    getSourceConfig(),
    getFilterConfig(),
    getBatchUiPreferences()
  ])

  return {
    enabled: resolveSourceEnabled(sourceId, sourceConfig),
    filters: filterConfig.rules,
    lastSavePath: preferences.lastSavePath
  }
}