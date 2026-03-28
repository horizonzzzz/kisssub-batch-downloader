import { useEffect, useMemo, useRef, useState } from "react"

import { useFormContext, useWatch } from "react-hook-form"

import acgripSiteIcon from "../../../../assets/site-icon-acgrip.png"
import bangumiMoeSiteIcon from "../../../../assets/site-icon-bangumimoe.svg"
import dongmanhuayuanSiteIcon from "../../../../assets/site-icon-dongmanhuayuan.png"
import kisssubSiteIcon from "../../../../assets/site-icon-kisssub.png"
import { resolveSourceDeliveryMode } from "../../../../lib/sources/delivery"
import {
  SITE_CONFIG_META,
  type SiteConfigMeta
} from "../../../../lib/sources/site-meta"
import { SOURCE_IDS } from "../../../../lib/sources/catalog"
import { normalizeEnabledSources, resolveSourceEnabled } from "../../../../lib/settings"
import type { SourceId } from "../../../../lib/shared/types"
import type {
  SettingsFormInput,
  SettingsFormValues
} from "../../schema/settings-form"
import { SiteCard } from "./SiteCard"

const SITE_ICONS: Record<SourceId, string> = {
  kisssub: kisssubSiteIcon,
  dongmanhuayuan: dongmanhuayuanSiteIcon,
  acgrip: acgripSiteIcon,
  bangumimoe: bangumiMoeSiteIcon
}

function buildSortedSites(enabledSources: SettingsFormValues["enabledSources"]): SiteConfigMeta[] {
  return SOURCE_IDS.map((sourceId) => SITE_CONFIG_META[sourceId]).sort((left, right) => {
    const leftEnabled = resolveSourceEnabled(left.id, { enabledSources })
    const rightEnabled = resolveSourceEnabled(right.id, { enabledSources })

    if (leftEnabled === rightEnabled) {
      return SOURCE_IDS.indexOf(left.id) - SOURCE_IDS.indexOf(right.id)
    }

    return leftEnabled ? -1 : 1
  })
}

export function SiteManagementView() {
  const { control, setValue } = useFormContext<
    SettingsFormInput,
    unknown,
    SettingsFormValues
  >()
  const enabledSources = normalizeEnabledSources(
    useWatch({ control, name: "enabledSources" })
  )
  const sourceDeliveryModes = useWatch({ control, name: "sourceDeliveryModes" }) ?? {}
  const [expandedSites, setExpandedSites] = useState<SourceId[]>([])
  const hasSyncedExpandedSites = useRef(false)
  const previousEnabledSourcesRef = useRef<SettingsFormValues["enabledSources"] | null>(null)

  useEffect(() => {
    const currentEnabledSources = normalizeEnabledSources(enabledSources)

    if (!hasSyncedExpandedSites.current) {
      setExpandedSites(SOURCE_IDS.filter((sourceId) => currentEnabledSources[sourceId]))
      hasSyncedExpandedSites.current = true
      previousEnabledSourcesRef.current = currentEnabledSources
      return
    }

    const previousEnabledSources =
      previousEnabledSourcesRef.current ?? currentEnabledSources

    const newlyEnabled = SOURCE_IDS.filter(
      (sourceId) =>
        !previousEnabledSources[sourceId] && currentEnabledSources[sourceId]
    )
    const newlyDisabled = SOURCE_IDS.filter(
      (sourceId) =>
        previousEnabledSources[sourceId] && !currentEnabledSources[sourceId]
    )

    if (newlyEnabled.length || newlyDisabled.length) {
      setExpandedSites((currentExpandedSites) => {
        const nextExpandedSites = currentExpandedSites.filter(
          (sourceId) => !newlyDisabled.includes(sourceId)
        )

        for (const sourceId of newlyEnabled) {
          if (!nextExpandedSites.includes(sourceId)) {
            nextExpandedSites.push(sourceId)
          }
        }

        return nextExpandedSites
      })
    }

    previousEnabledSourcesRef.current = currentEnabledSources
  }, [enabledSources])

  const sortedSites = useMemo(() => buildSortedSites(enabledSources), [enabledSources])

  const enabledCount = useMemo(
    () =>
      SOURCE_IDS.filter((sourceId) =>
        resolveSourceEnabled(sourceId, { enabledSources })
      ).length,
    [enabledSources]
  )

  const toggleSiteExpanded = (sourceId: SourceId) => {
    if (!resolveSourceEnabled(sourceId, { enabledSources })) {
      return
    }

    setExpandedSites((currentExpandedSites) =>
      currentExpandedSites.includes(sourceId)
        ? currentExpandedSites.filter((currentId) => currentId !== sourceId)
        : [...currentExpandedSites, sourceId]
    )
  }

  const toggleEnabled = (sourceId: SourceId, enabled: boolean) => {
    setValue(`enabledSources.${sourceId}`, enabled, { shouldDirty: true })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
        当前已启用 {enabledCount} / {SOURCE_IDS.length} 个站点
      </div>

      <div className="grid gap-4">
        {sortedSites.map((site) => {
          const isEnabled = resolveSourceEnabled(site.id, { enabledSources })
          const isExpanded = isEnabled && expandedSites.includes(site.id)
          const currentMode = resolveSourceDeliveryMode(site.id, { sourceDeliveryModes })

          return (
            <SiteCard
              key={site.id}
              site={site}
              siteIcon={SITE_ICONS[site.id]}
              isEnabled={isEnabled}
              isExpanded={isExpanded}
              currentMode={currentMode}
              onToggleExpanded={toggleSiteExpanded}
              onToggleEnabled={toggleEnabled}
            />
          )
        })}
      </div>
    </div>
  )
}
