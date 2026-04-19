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
import type { SettingsFormValues } from "../../schema/settings-form"
import type { SourceConfig } from "../../../../lib/sources/config/types"

function normalizeEnabledSourcesFromForm(raw: unknown): Record<SourceId, boolean> {
  const record = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {}
  const normalized = {} as Record<SourceId, boolean>

  for (const sourceId of SOURCE_IDS) {
    normalized[sourceId] =
      typeof record[sourceId] === "boolean"
        ? (record[sourceId] as boolean)
        : DEFAULT_SOURCE_CONFIG[sourceId].enabled
  }

  return normalized
}

function toSourceConfig(enabledSources: Record<SourceId, boolean>): SourceConfig {
  return {
    kisssub: {
      enabled: enabledSources.kisssub ?? DEFAULT_SOURCE_CONFIG.kisssub.enabled,
      deliveryMode: DEFAULT_SOURCE_CONFIG.kisssub.deliveryMode,
      script: DEFAULT_SOURCE_CONFIG.kisssub.script
    },
    dongmanhuayuan: {
      enabled: enabledSources.dongmanhuayuan ?? DEFAULT_SOURCE_CONFIG.dongmanhuayuan.enabled,
      deliveryMode: DEFAULT_SOURCE_CONFIG.dongmanhuayuan.deliveryMode
    },
    acgrip: {
      enabled: enabledSources.acgrip ?? DEFAULT_SOURCE_CONFIG.acgrip.enabled,
      deliveryMode: DEFAULT_SOURCE_CONFIG.acgrip.deliveryMode
    },
    bangumimoe: {
      enabled: enabledSources.bangumimoe ?? DEFAULT_SOURCE_CONFIG.bangumimoe.enabled,
      deliveryMode: DEFAULT_SOURCE_CONFIG.bangumimoe.deliveryMode
    }
  }
}

export function buildSortedSites(
  enabledSources: SettingsFormValues["enabledSources"]
): SiteConfigMeta[] {
  const normalizedEnabledSources = normalizeEnabledSourcesFromForm(enabledSources)
  const sourceConfig = toSourceConfig(normalizedEnabledSources)
  const enabledSourceIds = getEnabledSources(SOURCE_IDS, sourceConfig)

  return SOURCE_IDS.map((sourceId) => SITE_CONFIG_META[sourceId]).sort((left, right) => {
    const leftEnabled = enabledSourceIds.includes(left.id)
    const rightEnabled = enabledSourceIds.includes(right.id)

    if (leftEnabled === rightEnabled) {
      return SOURCE_IDS.indexOf(left.id) - SOURCE_IDS.indexOf(right.id)
    }

    return leftEnabled ? -1 : 1
  })
}

export function countEnabledSites(
  enabledSources: SettingsFormValues["enabledSources"]
): number {
  const normalizedEnabledSources = normalizeEnabledSourcesFromForm(enabledSources)
  const sourceConfig = toSourceConfig(normalizedEnabledSources)
  return getEnabledSources(SOURCE_IDS, sourceConfig).length
}

export function getInitialExpandedSites(
  enabledSources: SettingsFormValues["enabledSources"]
): SourceId[] {
  const normalizedEnabledSources = normalizeEnabledSourcesFromForm(enabledSources)
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
    normalizeEnabledSourcesFromForm(previousEnabledSources)
  const normalizedNextEnabledSources =
    normalizeEnabledSourcesFromForm(nextEnabledSources)
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
