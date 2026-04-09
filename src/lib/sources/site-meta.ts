import { i18n } from "../i18n"

import type { SourceId } from "../shared/types"

export type SiteConfigMeta = {
  id: SourceId
  url: string
  storageDisplayName: string
  overviewAccent: "default" | "emerald" | "cyan"
  strategyMode: "editable" | "locked"
  hasKisssubScriptFields?: boolean
  noteTone?: "info" | "warning" | "neutral"
}

export type LocalizedSiteConfigMeta = SiteConfigMeta & {
  navLabel: string
  displayName: string
  summary: string
  badgeWhenEnabled: string
  badgeWhenDisabled: string
  lockedStrategyLabel?: string
  noteTitle?: string
  noteDescription?: string
}

export const SITE_CONFIG_META: Record<SourceId, SiteConfigMeta> = Object.freeze({
  kisssub: {
    id: "kisssub",
    url: "kisssub.org",
    storageDisplayName: "Kisssub 爱恋动漫",
    overviewAccent: "default",
    strategyMode: "editable",
    hasKisssubScriptFields: true
  },
  dongmanhuayuan: {
    id: "dongmanhuayuan",
    url: "dongmanhuayuan.com",
    storageDisplayName: "Dongmanhuayuan 动漫花园",
    overviewAccent: "emerald",
    strategyMode: "locked",
    noteTone: "info",
  },
  acgrip: {
    id: "acgrip",
    url: "acg.rip",
    storageDisplayName: "ACG.RIP",
    overviewAccent: "cyan",
    strategyMode: "editable",
    noteTone: "warning",
  },
  bangumimoe: {
    id: "bangumimoe",
    url: "bangumi.moe",
    storageDisplayName: "Bangumi.moe",
    overviewAccent: "default",
    strategyMode: "editable"
  }
})

export function getLocalizedSiteConfigMeta(sourceId: SourceId): LocalizedSiteConfigMeta {
  const site = SITE_CONFIG_META[sourceId]
  const baseKey = `options.sites.catalog.${sourceId}` as const

  return {
    ...site,
    navLabel: i18n.t(`${baseKey}.navLabel`),
    displayName: i18n.t(`${baseKey}.displayName`),
    summary: i18n.t(`${baseKey}.summary`),
    badgeWhenEnabled: i18n.t("options.sites.badge.enabled"),
    badgeWhenDisabled: i18n.t("options.sites.badge.disabled"),
    lockedStrategyLabel:
      site.strategyMode === "locked" ? i18n.t(`${baseKey}.lockedStrategyLabel`) : undefined,
    noteTitle: sourceId === "acgrip" ? i18n.t(`${baseKey}.noteTitle`) : undefined,
    noteDescription:
      sourceId === "dongmanhuayuan" || sourceId === "acgrip"
        ? i18n.t(`${baseKey}.noteDescription`)
        : undefined
  }
}

