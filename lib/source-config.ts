import type { SourceId } from "./types"

export const SOURCE_IDS: SourceId[] = ["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"]

export const DEFAULT_ENABLED_SOURCES: Record<SourceId, boolean> = Object.freeze({
  kisssub: true,
  dongmanhuayuan: true,
  acgrip: true,
  bangumimoe: true
})

export type SiteConfigMeta = {
  id: SourceId
  navLabel: string
  displayName: string
  summary: string
  url: string
  badgeWhenEnabled: string
  badgeWhenDisabled: string
}

export const SITE_CONFIG_META: Record<SourceId, SiteConfigMeta> = Object.freeze({
  kisssub: {
    id: "kisssub",
    navLabel: "Kisssub",
    displayName: "Kisssub 爱恋动漫",
    summary: "整合番组表与字幕组的动漫资源站",
    url: "kisssub.org",
    badgeWhenEnabled: "已启用",
    badgeWhenDisabled: "未启用"
  },
  dongmanhuayuan: {
    id: "dongmanhuayuan",
    navLabel: "Dongmanhuayuan",
    displayName: "Dongmanhuayuan 动漫花园",
    summary: "面向动漫爱好者的BT资源交流站",
    url: "dongmanhuayuan.com",
    badgeWhenEnabled: "已启用",
    badgeWhenDisabled: "未启用"
  },
  acgrip: {
    id: "acgrip",
    navLabel: "ACG.RIP",
    displayName: "ACG.RIP",
    summary: "分类清晰、以种子直下为主的ACG站",
    url: "acg.rip",
    badgeWhenEnabled: "已启用",
    badgeWhenDisabled: "未启用"
  },
  bangumimoe: {
    id: "bangumimoe",
    navLabel: "Bangumi.moe",
    displayName: "Bangumi.moe",
    summary: "追番日历结合最新种子发布的社区",
    url: "bangumi.moe",
    badgeWhenEnabled: "已启用",
    badgeWhenDisabled: "未启用"
  }
})
