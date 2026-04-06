import { SOURCE_IDS } from "../../../../lib/sources/catalog"
import {
  SITE_CONFIG_META,
  type SiteConfigMeta
} from "../../../../lib/sources/site-meta"
import {
  normalizeEnabledSources,
  resolveSourceEnabled
} from "../../../../lib/settings"
import type { SourceId } from "../../../../lib/shared/types"
import type { SettingsFormValues } from "../../schema/settings-form"

export function buildSortedSites(
  enabledSources: SettingsFormValues["enabledSources"]
): SiteConfigMeta[] {
  return SOURCE_IDS.map((sourceId) => SITE_CONFIG_META[sourceId]).sort((left, right) => {
    const leftEnabled = resolveSourceEnabled(left.id, { enabledSources })
    const rightEnabled = resolveSourceEnabled(right.id, { enabledSources })

    if (leftEnabled === rightEnabled) {
      return SOURCE_IDS.indexOf(left.id) - SOURCE_IDS.indexOf(right.id)
    }

    return leftEnabled ? -1 : 1
  })
}

export function countEnabledSites(
  enabledSources: SettingsFormValues["enabledSources"]
): number {
  return SOURCE_IDS.filter((sourceId) =>
    resolveSourceEnabled(sourceId, { enabledSources })
  ).length
}

export function getInitialExpandedSites(
  enabledSources: SettingsFormValues["enabledSources"]
): SourceId[] {
  const normalizedEnabledSources = normalizeEnabledSources(enabledSources)
  return SOURCE_IDS.filter((sourceId) => normalizedEnabledSources[sourceId])
}

type ReconcileExpandedSitesInput = {
  currentExpandedSites: SourceId[]
  previousEnabledSources: SettingsFormValues["enabledSources"]
  nextEnabledSources: SettingsFormValues["enabledSources"]
}

export function reconcileExpandedSites({
  currentExpandedSites,
  previousEnabledSources,
  nextEnabledSources
}: ReconcileExpandedSitesInput): SourceId[] {
  const normalizedPreviousEnabledSources =
    normalizeEnabledSources(previousEnabledSources)
  const normalizedNextEnabledSources = normalizeEnabledSources(nextEnabledSources)
  const newlyEnabled = SOURCE_IDS.filter(
    (sourceId) =>
      !normalizedPreviousEnabledSources[sourceId] &&
      normalizedNextEnabledSources[sourceId]
  )
  const newlyDisabled = SOURCE_IDS.filter(
    (sourceId) =>
      normalizedPreviousEnabledSources[sourceId] &&
      !normalizedNextEnabledSources[sourceId]
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
