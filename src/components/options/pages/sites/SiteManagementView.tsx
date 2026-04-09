import { i18n } from "../../../../lib/i18n"
import { useEffect, useMemo, useRef, useState } from "react"

import { useFormContext, useWatch } from "react-hook-form"

import acgripSiteIcon from "../../../../assets/site-icon-acgrip.png"
import bangumiMoeSiteIcon from "../../../../assets/site-icon-bangumimoe.svg"
import dongmanhuayuanSiteIcon from "../../../../assets/site-icon-dongmanhuayuan.png"
import kisssubSiteIcon from "../../../../assets/site-icon-kisssub.png"
import { resolveSourceDeliveryMode } from "../../../../lib/sources/delivery"
import { SOURCE_IDS } from "../../../../lib/sources/catalog"
import { getLocalizedSiteConfigMeta } from "../../../../lib/sources/site-meta"
import { normalizeEnabledSources, resolveSourceEnabled } from "../../../../lib/settings"
import type { SourceId } from "../../../../lib/shared/types"
import type {
  SettingsFormInput,
  SettingsFormValues
} from "../../schema/settings-form"
import { SiteCard } from "./SiteCard"
import {
  buildSortedSites,
  countEnabledSites,
  getInitialExpandedSites,
  reconcileExpandedSites
} from "./site-management"

const SITE_ICONS: Record<SourceId, string> = {
  kisssub: kisssubSiteIcon,
  dongmanhuayuan: dongmanhuayuanSiteIcon,
  acgrip: acgripSiteIcon,
  bangumimoe: bangumiMoeSiteIcon
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
      setExpandedSites(getInitialExpandedSites(currentEnabledSources))
      hasSyncedExpandedSites.current = true
      previousEnabledSourcesRef.current = currentEnabledSources
      return
    }

    const previousEnabledSources =
      previousEnabledSourcesRef.current ?? currentEnabledSources
    setExpandedSites((currentExpandedSites) =>
      reconcileExpandedSites({
        currentExpandedSites,
        previousEnabledSources,
        nextEnabledSources: currentEnabledSources
      })
    )

    previousEnabledSourcesRef.current = currentEnabledSources
  }, [enabledSources])

  const sortedSites = useMemo(() => buildSortedSites(enabledSources), [enabledSources])

  const enabledCount = useMemo(() => countEnabledSites(enabledSources), [enabledSources])

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
    setValue(
      "enabledSources",
      {
        ...enabledSources,
        [sourceId]: enabled
      },
      { shouldDirty: true }
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700">
        {i18n.t("options.sites.enabledSummary", [enabledCount, SOURCE_IDS.length])}
      </div>

      <div className="grid gap-4">
        {sortedSites.map((site) => {
          const localizedSite = getLocalizedSiteConfigMeta(site.id)
          const isEnabled = resolveSourceEnabled(site.id, { enabledSources })
          const isExpanded = isEnabled && expandedSites.includes(site.id)
          const currentMode = resolveSourceDeliveryMode(site.id, { sourceDeliveryModes })

          return (
            <SiteCard
              key={site.id}
              site={localizedSite}
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


