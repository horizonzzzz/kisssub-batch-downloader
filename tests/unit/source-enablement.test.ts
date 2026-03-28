import { describe, expect, it } from "vitest"

import {
  getDisabledSources,
  normalizeEnabledSources,
  resolveSourceEnabled
} from "../../lib/settings"

describe("source enablement helpers", () => {
  it("keeps explicit boolean flags and defaults the rest to enabled", () => {
    expect(normalizeEnabledSources({ kisssub: false })).toEqual({
      kisssub: false,
      dongmanhuayuan: true,
      acgrip: true,
      bangumimoe: true
    })
  })

  it("treats missing values as enabled when resolving a single source", () => {
    expect(
      resolveSourceEnabled("acgrip", {
        enabledSources: {}
      })
    ).toBe(true)
  })

  it("returns every disabled source id from a candidate set", () => {
    expect(
      getDisabledSources(["kisssub", "acgrip", "bangumimoe"], {
        enabledSources: {
          kisssub: false,
          acgrip: true,
          bangumimoe: false
        }
      })
    ).toEqual(["kisssub", "bangumimoe"])
  })
})
