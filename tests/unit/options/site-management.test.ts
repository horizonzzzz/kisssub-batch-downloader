import { describe, expect, it } from "vitest"

import { DEFAULT_SOURCE_CONFIG } from "../../../src/lib/sources/config/defaults"
import type { SourceConfig } from "../../../src/lib/sources/config/types"
import {
  buildSortedSitesFromConfig,
  getInitialExpandedSitesFromConfig,
  reconcileExpandedSitesFromConfig
} from "../../../src/components/options/pages/sites/site-management"

function createTestSourceConfig(
  overrides: Partial<SourceConfig>
): SourceConfig {
  return {
    ...DEFAULT_SOURCE_CONFIG,
    ...overrides
  }
}

describe("site management helpers", () => {
  it("sorts enabled sites ahead of disabled sites while preserving catalog order", () => {
    const config = createTestSourceConfig({
      kisssub: {
        ...DEFAULT_SOURCE_CONFIG.kisssub,
        enabled: false
      },
      dongmanhuayuan: {
        ...DEFAULT_SOURCE_CONFIG.dongmanhuayuan,
        enabled: true
      },
      acgrip: {
        ...DEFAULT_SOURCE_CONFIG.acgrip,
        enabled: true
      },
      bangumimoe: {
        ...DEFAULT_SOURCE_CONFIG.bangumimoe,
        enabled: false
      }
    })
    const orderedIds = buildSortedSitesFromConfig(config).map((site) => site.id)

    expect(orderedIds).toEqual([
      "dongmanhuayuan",
      "acgrip",
      "kisssub",
      "bangumimoe"
    ])
  })

  it("initially expands every enabled site", () => {
    const config = createTestSourceConfig({
      kisssub: {
        ...DEFAULT_SOURCE_CONFIG.kisssub,
        enabled: true
      },
      dongmanhuayuan: {
        ...DEFAULT_SOURCE_CONFIG.dongmanhuayuan,
        enabled: false
      },
      acgrip: {
        ...DEFAULT_SOURCE_CONFIG.acgrip,
        enabled: true
      },
      bangumimoe: {
        ...DEFAULT_SOURCE_CONFIG.bangumimoe,
        enabled: true
      }
    })
    expect(getInitialExpandedSitesFromConfig(config)).toEqual([
      "kisssub",
      "acgrip",
      "bangumimoe"
    ])
  })

  it("drops newly disabled sites and appends newly enabled sites", () => {
    const previousConfig = createTestSourceConfig({
      kisssub: {
        ...DEFAULT_SOURCE_CONFIG.kisssub,
        enabled: true
      },
      dongmanhuayuan: {
        ...DEFAULT_SOURCE_CONFIG.dongmanhuayuan,
        enabled: false
      },
      acgrip: {
        ...DEFAULT_SOURCE_CONFIG.acgrip,
        enabled: true
      },
      bangumimoe: {
        ...DEFAULT_SOURCE_CONFIG.bangumimoe,
        enabled: false
      }
    })
    const nextConfig = createTestSourceConfig({
      kisssub: {
        ...DEFAULT_SOURCE_CONFIG.kisssub,
        enabled: false
      },
      dongmanhuayuan: {
        ...DEFAULT_SOURCE_CONFIG.dongmanhuayuan,
        enabled: true
      },
      acgrip: {
        ...DEFAULT_SOURCE_CONFIG.acgrip,
        enabled: true
      },
      bangumimoe: {
        ...DEFAULT_SOURCE_CONFIG.bangumimoe,
        enabled: false
      }
    })
    expect(
      reconcileExpandedSitesFromConfig({
        currentExpandedSites: ["kisssub", "acgrip"],
        previousConfig,
        nextConfig
      })
    ).toEqual(["acgrip", "dongmanhuayuan"])
  })
})
