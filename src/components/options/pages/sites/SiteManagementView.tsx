import { i18n } from "../../../../lib/i18n"
import { useEffect, useMemo, useRef, useState } from "react"
import { HiOutlineArrowPath } from "react-icons/hi2"

import { Button, Alert } from "../../../ui"
import { useOptionsPageFooter } from "../../layout/OptionsPageFooter"
import type { OptionsApi } from "../../OptionsPage"
import { useSourceConfigWorkbench } from "./use-source-config-workbench"

import acgripSiteIcon from "../../../../assets/site-icon-acgrip.png"
import bangumiMoeSiteIcon from "../../../../assets/site-icon-bangumimoe.svg"
import comicatSiteIcon from "../../../../assets/site-icon-comicat.svg"
import dongmanhuayuanSiteIcon from "../../../../assets/site-icon-dongmanhuayuan.png"
import kisssubSiteIcon from "../../../../assets/site-icon-kisssub.png"
import { getLocalizedSiteConfigMeta } from "../../../../lib/sources/site-meta"
import type { DeliveryMode, SourceId } from "../../../../lib/shared/types"
import type { SourceConfig } from "../../../../lib/sources/config/types"
import { SiteCard } from "./SiteCard"
import {
  buildSortedSitesFromConfig,
  getInitialExpandedSitesFromConfig,
  reconcileExpandedSitesFromConfig
} from "./site-management"

const SITE_ICONS: Record<SourceId, string> = {
  kisssub: kisssubSiteIcon,
  dongmanhuayuan: dongmanhuayuanSiteIcon,
  acgrip: acgripSiteIcon,
  bangumimoe: bangumiMoeSiteIcon,
  comicat: comicatSiteIcon
}

type SiteManagementViewProps = {
  api: OptionsApi
}

export function SiteManagementView({ api }: SiteManagementViewProps) {
  const { config, setConfig, status, loading, saving, save } = useSourceConfigWorkbench(api)
  const [expandedSites, setExpandedSites] = useState<SourceId[]>([])
  const hasSyncedExpandedSites = useRef(false)
  const previousConfigRef = useRef<SourceConfig | null>(null)

  // Sync expanded sites when config loads
  useEffect(() => {
    if (!config || hasSyncedExpandedSites.current) return
    setExpandedSites(getInitialExpandedSitesFromConfig(config))
    hasSyncedExpandedSites.current = true
    previousConfigRef.current = config
  }, [config])

  // Reconcile expanded sites when config changes
  useEffect(() => {
    if (!config || !previousConfigRef.current) return
    setExpandedSites((currentExpandedSites) =>
      reconcileExpandedSitesFromConfig({
        currentExpandedSites,
        previousConfig: previousConfigRef.current!,
        nextConfig: config
      })
    )
    previousConfigRef.current = config
  }, [config])

  const sortedSites = useMemo(() => {
    if (!config) return []
    return buildSortedSitesFromConfig(config)
  }, [config])
  const footerConfig = useMemo(() => {
    if (!config) {
      return null
    }

    return {
      description: i18n.t("options.footer.currentPageDescription"),
      actions: (
        <Button
          type="button"
          size="lg"
          className="min-w-[168px] sm:min-w-[192px]"
          onClick={() => void save()}
          disabled={loading || saving}>
          {saving ? (
            <HiOutlineArrowPath className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {saving ? i18n.t("common.processing") : i18n.t("options.sites.saveSites")}
        </Button>
      )
    }
  }, [config, loading, save, saving])

  useOptionsPageFooter(footerConfig)

  const toggleSiteExpanded = (sourceId: SourceId) => {
    if (!config || !config[sourceId].enabled) return
    setExpandedSites((currentExpandedSites) =>
      currentExpandedSites.includes(sourceId)
        ? currentExpandedSites.filter((currentId) => currentId !== sourceId)
        : [...currentExpandedSites, sourceId]
    )
  }

  const toggleEnabled = (sourceId: SourceId, enabled: boolean) => {
    if (!config) return
    setConfig((current) => {
      if (!current) return current
      return {
        ...current,
        [sourceId]: {
          ...current[sourceId],
          enabled
        }
      }
    })
  }

  const updateDeliveryMode = (sourceId: SourceId, deliveryMode: DeliveryMode) => {
    if (!config) return
    setConfig((current) => {
      if (!current) return current
      return {
        ...current,
        [sourceId]: {
          ...current[sourceId],
          deliveryMode
        }
      }
    })
  }

  if (!config) {
    return (
      <div className="space-y-8" data-testid="sites-workbench">
        <div role="status" aria-live="polite">
          <Alert tone={status.tone} title={status.message} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8" data-testid="sites-workbench">
      <div role="status" aria-live="polite">
        <Alert tone={status.tone} title={status.message} />
      </div>

      <section className="space-y-4">
        <div className="grid gap-4">
          {sortedSites.map((site) => {
            const localizedSite = getLocalizedSiteConfigMeta(site.id)
            const siteConfig = config[site.id]
            const isEnabled = siteConfig.enabled
            const isExpanded = isEnabled && expandedSites.includes(site.id)
            const currentMode = siteConfig.deliveryMode

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
                onDeliveryModeChange={updateDeliveryMode}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}
