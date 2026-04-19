import { i18n } from "../../../lib/i18n"

import {
  DEFAULT_OPTIONS_ROUTE,
  OPTIONS_ROUTE_PATHS,
  type OptionsRoutePath
} from "../../../lib/shared/options-routes"
export { DEFAULT_OPTIONS_ROUTE } from "../../../lib/shared/options-routes"

export type OptionsRouteId =
  | "general"
  | "sites"
  | "filters"
  | "subscriptions"
  | "history"
  | "overview"

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

const [
  GENERAL_ROUTE,
  SITES_ROUTE,
  FILTERS_ROUTE,
  SUBSCRIPTIONS_ROUTE,
  HISTORY_ROUTE,
  OVERVIEW_ROUTE
] = OPTIONS_ROUTE_PATHS

export const OPTIONS_ROUTES = [
  {
    id: "general",
    path: GENERAL_ROUTE,
    mode: "form"
  },
  {
    id: "sites",
    path: SITES_ROUTE,
    mode: "form"
  },
  {
    id: "filters",
    path: FILTERS_ROUTE,
    mode: "view"
  },
  {
    id: "subscriptions",
    path: SUBSCRIPTIONS_ROUTE,
    mode: "view"
  },
  {
    id: "history",
    path: HISTORY_ROUTE,
    mode: "view"
  },
  {
    id: "overview",
    path: OVERVIEW_ROUTE,
    mode: "view"
  }
 ] as const satisfies ReadonlyArray<Pick<OptionsRouteMeta, "id" | "path" | "mode">>

function localizeRoute(route: (typeof OPTIONS_ROUTES)[number]): OptionsRouteMeta {
  const baseKey = `options.routes.${route.id}` as const

  return {
    ...route,
    label: i18n.t(`${baseKey}.label`),
    title: i18n.t(`${baseKey}.title`),
    description: i18n.t(`${baseKey}.description`),
    footerLabel: i18n.t(`${baseKey}.footerLabel`)
  }
}

export function getOptionsRoutes(): OptionsRouteMeta[] {
  return OPTIONS_ROUTES.map(localizeRoute)
}

export function getOptionsRouteMeta(pathname: string) {
  const localizedRoutes = getOptionsRoutes()
  const routeMetaByPath = Object.fromEntries(
    localizedRoutes.map((route) => [route.path, route])
  ) as Record<string, OptionsRouteMeta>

  return routeMetaByPath[pathname] ?? routeMetaByPath[DEFAULT_OPTIONS_ROUTE]
}


