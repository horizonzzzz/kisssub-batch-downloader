import { SOURCE_IDS } from "../../../../lib/sources/catalog"
import {
  SITE_CONFIG_META,
  type SiteConfigMeta
} from "../../../../lib/sources/site-meta"
import {
  resolveSourceEnabled,
  getEnabledSources
} from "../../../../lib/sources/config/selectors"
import { DEFAULT_SOURCE_CONFIG } from "../../../../lib/sources/config/defaults"
import type { SourceId } from "../../../../lib/shared/types"
import type { SourceConfig } from "../../../../lib/sources/config/types"

export function buildSortedSitesFromConfig(config: SourceConfig): SiteConfigMeta[] {
  const enabledSourceIds = getEnabledSources(SOURCE_IDS, config)

  return SOURCE_IDS.map((sourceId) => SITE_CONFIG_META[sourceId]).sort((left, right) => {
    const leftEnabled = enabledSourceIds.includes(left.id)
    const rightEnabled = enabledSourceIds.includes(right.id)

    if (leftEnabled === rightEnabled) {
      return SOURCE_IDS.indexOf(left.id) - SOURCE_IDS.indexOf(right.id)
    }

    return leftEnabled ? -1 : 1
  })
}

export function getInitialExpandedSitesFromConfig(config: SourceConfig): SourceId[] {
  return SOURCE_IDS.filter((sourceId) => resolveSourceEnabled(sourceId, config))
}

type ReconcileExpandedSitesFromConfigInput = {
  currentExpandedSites: SourceId[]
  previousConfig: SourceConfig
  nextConfig: SourceConfig
}

export function reconcileExpandedSitesFromConfig({
  currentExpandedSites,
  previousConfig,
  nextConfig
}: ReconcileExpandedSitesFromConfigInput): SourceId[] {
  const newlyEnabled = SOURCE_IDS.filter(
    (sourceId) =>
      !resolveSourceEnabled(sourceId, previousConfig) &&
      resolveSourceEnabled(sourceId, nextConfig)
  )
  const newlyDisabled = SOURCE_IDS.filter(
    (sourceId) =>
      resolveSourceEnabled(sourceId, previousConfig) &&
      !resolveSourceEnabled(sourceId, nextConfig)
  )

  if (!newlyEnabled.length && !newlyDisabled.length) {
    return currentExpandedSites
  }

  const nextExpandedSites = currentExpandedSites.filter(
    (sourceId) => !newlyDisabled.includes(sourceId)
  )

  for (const sourceId of newlyEnabled) {
    if (!nextExpandedSites.includes(sourceId)) {
      nextExpandedSites.push(sourceId)
    }
  }

  return nextExpandedSites
}
