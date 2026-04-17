import { describe, expect, it } from "vitest"

import {
  createSubscriptionDraft,
  normalizeSubscriptionDraft,
  summarizeSubscriptionRecentHits
} from "../../../src/components/options/pages/subscriptions/subscription-workbench"
import type { SubscriptionEntry, SubscriptionHitRecord } from "../../../src/lib/shared/types"

function createSubscription(overrides: Partial<SubscriptionEntry> = {}): SubscriptionEntry {
  return {
    id: "sub-1",
    name: "Medalist",
    enabled: true,
    sourceIds: ["acgrip"],
    multiSiteModeEnabled: false,
    titleQuery: "Medalist",
    subgroupQuery: "",
    advanced: {
      must: [],
      any: []
    },
    deliveryMode: "direct-only",
    createdAt: "2026-04-13T00:00:00.000Z",
    baselineCreatedAt: "2026-04-13T00:00:00.000Z",
    ...overrides
  }
}

function createHit(overrides: Partial<SubscriptionHitRecord> = {}): SubscriptionHitRecord {
  return {
    id: "hit-1",
    subscriptionId: "sub-1",
    sourceId: "acgrip",
    title: "[LoliHouse] Medalist - 01 [1080p]",
    normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
    subgroup: "LoliHouse",
    detailUrl: "https://acg.rip/t/100",
    magnetUrl: "",
    torrentUrl: "https://acg.rip/t/100.torrent",
    discoveredAt: "2026-04-14T08:00:00.000Z",
    downloadedAt: null,
    downloadStatus: "idle",
    ...overrides
  }
}

describe("subscription workbench helpers", () => {
  it("coerces Bangumi.moe subscriptions to allow detail extraction in drafts and saves", () => {
    const existingBangumiSubscription = createSubscription({
      sourceIds: ["bangumimoe"],
      deliveryMode: "direct-only"
    })

    expect(createSubscriptionDraft(existingBangumiSubscription).deliveryMode).toBe(
      "allow-detail-extraction"
    )
    expect(
      normalizeSubscriptionDraft(
        createSubscription({
          sourceIds: ["bangumimoe"],
          deliveryMode: "direct-only"
        })
      ).deliveryMode
    ).toBe("allow-detail-extraction")
  })

  it("keeps direct-only for sources that retain direct links", () => {
    expect(
      normalizeSubscriptionDraft(
        createSubscription({
          sourceIds: ["acgrip"],
          deliveryMode: "direct-only"
        })
      ).deliveryMode
    ).toBe("direct-only")
  })

  it("summarizes the newest retained hit instead of the oldest one", () => {
    const summary = summarizeSubscriptionRecentHits([
      createHit({
        id: "hit-1",
        title: "[LoliHouse] Medalist - 01 [1080p]"
      }),
      createHit({
        id: "hit-2",
        title: "[LoliHouse] Medalist - 02 [1080p]",
        detailUrl: "https://acg.rip/t/101",
        torrentUrl: "https://acg.rip/t/101.torrent",
        discoveredAt: "2026-04-14T09:00:00.000Z"
      })
    ])

    expect(summary).toContain("02")
    expect(summary).not.toContain("01 [1080p], plus 2")
  })
})
