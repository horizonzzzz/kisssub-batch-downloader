import {
  DEFAULT_OPTIONS_ROUTE,
  OPTIONS_ROUTE_PATHS,
  type OptionsRoutePath
} from "../../../lib/shared/options-routes"
export { DEFAULT_OPTIONS_ROUTE } from "../../../lib/shared/options-routes"

export type OptionsRouteId = "general" | "sites" | "filters" | "history" | "overview"

export type OptionsRouteMode = "form" | "view"

export type OptionsRouteMeta = {
  id: OptionsRouteId
  path: OptionsRoutePath
  label: string
  title: string
  description: string
  footerLabel: string
  mode: OptionsRouteMode
}

const [GENERAL_ROUTE, SITES_ROUTE, FILTERS_ROUTE, HISTORY_ROUTE, OVERVIEW_ROUTE] = OPTIONS_ROUTE_PATHS

export const OPTIONS_ROUTES: OptionsRouteMeta[] = [
  {
    id: "general",
    path: GENERAL_ROUTE,
    label: "连接与基础设置",
    title: "连接与基础设置",
    description: "配置 qBittorrent WebUI 的连接信息，以及全局批量提取节奏。",
    footerLabel: "正在编辑全局配置",
    mode: "form"
  },
  {
    id: "sites",
    path: SITES_ROUTE,
    label: "站点配置",
    title: "站点配置",
    description: "统一管理 4 个站点的启用状态和专属配置。",
    footerLabel: "正在编辑站点配置",
    mode: "form"
  },
  {
    id: "filters",
    path: FILTERS_ROUTE,
    label: "过滤规则",
    title: "过滤规则",
    description: "只保留命中筛选器的资源，让批量提交更贴近真实使用场景。",
    footerLabel: "正在编辑过滤规则",
    mode: "form"
  },
  {
    id: "history",
    path: HISTORY_ROUTE,
    label: "批次历史",
    title: "批次历史",
    description: "查看历史批量提交记录，追溯下载状态和失败原因。",
    footerLabel: "正在查看批次历史",
    mode: "view"
  },
  {
    id: "overview",
    path: OVERVIEW_ROUTE,
    label: "源站概览",
    title: "源站概览",
    description: "查看当前支持站点的简介与访问入口。",
    footerLabel: "正在查看支持源站概览",
    mode: "view"
  }
]

const routeMetaByPath = Object.fromEntries(
  OPTIONS_ROUTES.map((route) => [route.path, route])
) as Record<string, OptionsRouteMeta>

export function getOptionsRouteMeta(pathname: string) {
  return routeMetaByPath[pathname] ?? routeMetaByPath[DEFAULT_OPTIONS_ROUTE]
}
