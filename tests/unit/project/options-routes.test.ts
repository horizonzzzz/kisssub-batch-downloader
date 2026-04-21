import { describe, expect, it } from "vitest"

import {
  DEFAULT_OPTIONS_ROUTE,
  OPTIONS_ROUTE_PATHS,
  isOptionsRoutePath
} from "../../../src/lib/shared/options-routes"
import { OPTIONS_ROUTES } from "../../../src/components/options/config/routes"
import { normalizePopupOptionsRoute } from "../../../src/lib/background/popup"

describe("shared options route paths", () => {
  it("keeps options config paths aligned with shared route-path source of truth", () => {
    expect(OPTIONS_ROUTE_PATHS).toContain("/subscriptions")
    expect(OPTIONS_ROUTE_PATHS).toContain("/subscription-hits")
    expect(OPTIONS_ROUTES.map((route) => route.path)).toEqual(OPTIONS_ROUTE_PATHS)
    expect(DEFAULT_OPTIONS_ROUTE).toBe("/general")
  })

  it("supports popup-side normalization using the same shared route set", () => {
    expect(isOptionsRoutePath("/filters")).toBe(true)
    expect(isOptionsRoutePath("/subscriptions")).toBe(true)
    expect(isOptionsRoutePath("/subscription-hits")).toBe(true)
    expect(isOptionsRoutePath("/invalid")).toBe(false)
    expect(normalizePopupOptionsRoute("/history")).toBe("/history")
    expect(normalizePopupOptionsRoute("/subscriptions")).toBe("/subscriptions")
    expect(normalizePopupOptionsRoute("/subscription-hits")).toBe("/subscription-hits")
    expect(normalizePopupOptionsRoute("/invalid")).toBe("/general")
  })
})
