export const OPTIONS_ROUTE_PATHS = [
  "/general",
  "/sites",
  "/filters",
  "/subscriptions",
  "/subscription-hits",
  "/history",
  "/overview"
] as const

export const [
  GENERAL_ROUTE,
  SITES_ROUTE,
  FILTERS_ROUTE,
  SUBSCRIPTIONS_ROUTE,
  SUBSCRIPTION_HITS_ROUTE,
  HISTORY_ROUTE,
  OVERVIEW_ROUTE
] =
  OPTIONS_ROUTE_PATHS

export type OptionsRoutePath = (typeof OPTIONS_ROUTE_PATHS)[number]

export const DEFAULT_OPTIONS_ROUTE: OptionsRoutePath = GENERAL_ROUTE

export function isOptionsRoutePath(value: unknown): value is OptionsRoutePath {
  return typeof value === "string" && (OPTIONS_ROUTE_PATHS as readonly string[]).includes(value)
}
