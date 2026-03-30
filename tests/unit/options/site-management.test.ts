import { describe, expect, it } from "vitest"

import {
  buildSortedSites,
  countEnabledSites,
  getInitialExpandedSites,
  reconcileExpandedSites
} from "../../../components/options/pages/sites/site-management"

describe("site management helpers", () => {
  it("sorts enabled sites ahead of disabled sites while preserving catalog order", () => {
    const orderedIds = buildSortedSites({
      kisssub: false,
      dongmanhuayuan: true,
      acgrip: true,
      bangumimoe: false
    }).map((site) => site.id)

    expect(orderedIds).toEqual([
      "dongmanhuayuan",
      "acgrip",
      "kisssub",
      "bangumimoe"
    ])
  })

  it("counts only enabled sites", () => {
    expect(
      countEnabledSites({
        kisssub: true,
        dongmanhuayuan: false,
        acgrip: true,
        bangumimoe: false
      })
    ).toBe(2)
  })

  it("initially expands every enabled site", () => {
    expect(
      getInitialExpandedSites({
        kisssub: true,
        dongmanhuayuan: false,
        acgrip: true,
        bangumimoe: true
      })
    ).toEqual(["kisssub", "acgrip", "bangumimoe"])
  })

  it("drops newly disabled sites and appends newly enabled sites", () => {
    expect(
      reconcileExpandedSites({
        currentExpandedSites: ["kisssub", "acgrip"],
        previousEnabledSources: {
          kisssub: true,
          dongmanhuayuan: false,
          acgrip: true,
          bangumimoe: false
        },
        nextEnabledSources: {
          kisssub: false,
          dongmanhuayuan: true,
          acgrip: true,
          bangumimoe: false
        }
      })
    ).toEqual(["acgrip", "dongmanhuayuan"])
  })
})
