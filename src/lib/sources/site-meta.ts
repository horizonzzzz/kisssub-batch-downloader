import type { SourceId } from "../shared/types"

export type SiteConfigMeta = {
  id: SourceId
  navLabel: string
  displayName: string
  summary: string
  url: string
  overviewAccent: "default" | "emerald" | "cyan"
  badgeWhenEnabled: string
  badgeWhenDisabled: string
  strategyMode: "editable" | "locked"
  lockedStrategyLabel?: string
  hasKisssubScriptFields?: boolean
  noteTone?: "info" | "warning" | "neutral"
  noteTitle?: string
  noteDescription?: string
}

export const SITE_CONFIG_META: Record<SourceId, SiteConfigMeta> = Object.freeze({
  kisssub: {
    id: "kisssub",
    navLabel: "Kisssub",
    displayName: "Kisssub 爱恋动漫",
    summary: "整合番组表与字幕组的动漫资源站",
    url: "kisssub.org",
    overviewAccent: "default",
    badgeWhenEnabled: "已启用",
    badgeWhenDisabled: "未启用",
    strategyMode: "editable",
    hasKisssubScriptFields: true
  },
  dongmanhuayuan: {
    id: "dongmanhuayuan",
    navLabel: "Dongmanhuayuan",
    displayName: "Dongmanhuayuan 动漫花园",
    summary: "面向动漫爱好者的BT资源交流站",
    url: "dongmanhuayuan.com",
    overviewAccent: "emerald",
    badgeWhenEnabled: "已启用",
    badgeWhenDisabled: "未启用",
    strategyMode: "locked",
    lockedStrategyLabel: "当前仅支持磁力链下载方式",
    noteTone: "info",
    noteDescription: "动漫花园当前仅支持提取磁力链接，无需额外配置。"
  },
  acgrip: {
    id: "acgrip",
    navLabel: "ACG.RIP",
    displayName: "ACG.RIP",
    summary: "分类清晰、以种子直下为主的ACG站",
    url: "acg.rip",
    overviewAccent: "cyan",
    badgeWhenEnabled: "已启用",
    badgeWhenDisabled: "未启用",
    strategyMode: "editable",
    noteTone: "warning",
    noteTitle: "建议先下载种子再上传到 qB",
    noteDescription: "qB 直接拉取该站种子链接可能失效。"
  },
  bangumimoe: {
    id: "bangumimoe",
    navLabel: "Bangumi.moe",
    displayName: "Bangumi.moe",
    summary: "追番日历结合最新种子发布的社区",
    url: "bangumi.moe",
    overviewAccent: "default",
    badgeWhenEnabled: "已启用",
    badgeWhenDisabled: "未启用",
    strategyMode: "editable"
  }
})
