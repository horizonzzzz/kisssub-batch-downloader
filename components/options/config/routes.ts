export type OptionsRouteId = "general" | "sites" | "history" | "overview"

export type OptionsRouteMeta = {
  id: OptionsRouteId
  path: string
  label: string
  title: string
  description: string
  footerLabel: string
}

export const DEFAULT_OPTIONS_ROUTE = "/general"

export const OPTIONS_ROUTES: OptionsRouteMeta[] = [
  {
    id: "general",
    path: "/general",
    label: "连接与基础设置",
    title: "连接与基础设置",
    description: "配置 qBittorrent WebUI 的连接信息，以及全局批量提取节奏。",
    footerLabel: "正在编辑全局配置"
  },
  {
    id: "sites",
    path: "/sites",
    label: "站点配置",
    title: "站点配置",
    description: "统一管理 4 个站点的启用状态和专属配置。",
    footerLabel: "正在编辑站点配置"
  },
  {
    id: "history",
    path: "/history",
    label: "批次历史",
    title: "批次历史",
    description: "查看历史批量提交记录，追溯下载状态和失败原因。",
    footerLabel: "正在查看批次历史"
  },
  {
    id: "overview",
    path: "/overview",
    label: "源站概览",
    title: "源站概览",
    description: "查看当前支持站点的简介与访问入口。",
    footerLabel: "正在查看支持源站概览"
  }
]

const routeMetaByPath = Object.fromEntries(
  OPTIONS_ROUTES.map((route) => [route.path, route])
) as Record<string, OptionsRouteMeta>

export function getOptionsRouteMeta(pathname: string) {
  return routeMetaByPath[pathname] ?? routeMetaByPath[DEFAULT_OPTIONS_ROUTE]
}
