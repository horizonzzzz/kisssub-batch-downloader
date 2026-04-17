import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type {
  SubscriptionEntry,
  SubscriptionHitRecord
} from "../../../src/lib/shared/types"
import {
  replaceSubscriptionCatalog,
  upsertSubscription
} from "../../../src/lib/subscriptions/catalog-repository"
import {
  resetSubscriptionDb,
  subscriptionDb
} from "../../../src/lib/subscriptions/db"

function createSubscription(
  overrides: Partial<SubscriptionEntry> = {}
): SubscriptionEntry {
  return {
    id: "sub-1",
    name: "Medalist",
    enabled: true,
    sourceIds: ["acgrip"],
    multiSiteModeEnabled: false,
    titleQuery: "medalist",
    subgroupQuery: "",
    advanced: {
      must: [],
      any: []
    },
    deliveryMode: "direct-only",
    createdAt: "2026-04-01T00:00:00.000Z",
    baselineCreatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides
  }
}

function createHit(overrides: Partial<SubscriptionHitRecord> = {}): SubscriptionHitRecord {
  return {
    id: "hit-1",
    subscriptionId: "sub-1",
    sourceId: "acgrip",
    title: "Medalist 01",
    normalizedTitle: "medalist 01",
    subgroup: "",
    detailUrl: "https://acg.rip/t/1",
    magnetUrl: "magnet:?xt=urn:btih:1",
    torrentUrl: "",
    discoveredAt: "2026-04-17T10:00:00.000Z",
    downloadedAt: null,
    downloadStatus: "idle",
    ...overrides
  }
}

describe("replaceSubscriptionCatalog", () => {
  beforeEach(async () => {
    await resetSubscriptionDb()
  })

  afterEach(async () => {
    await resetSubscriptionDb()
  })

  it("replaces the subscription catalog and prunes runtime-owned rows for removed definitions", async () => {
    await replaceSubscriptionCatalog([
      createSubscription({ id: "sub-1", titleQuery: "medalist" }),
      createSubscription({
        id: "sub-2",
        name: "Frieren",
        titleQuery: "frieren",
        createdAt: "2026-04-02T00:00:00.000Z",
        baselineCreatedAt: "2026-04-02T00:00:00.000Z"
      })
    ])

    await subscriptionDb.subscriptionRuntime.bulkPut([
      {
        subscriptionId: "sub-1",
        lastScanAt: "2026-04-17T10:00:00.000Z",
        lastMatchedAt: null,
        lastError: "",
        seenFingerprints: ["fp-1"]
      },
      {
        subscriptionId: "sub-2",
        lastScanAt: "2026-04-17T11:00:00.000Z",
        lastMatchedAt: null,
        lastError: "",
        seenFingerprints: ["fp-2"]
      }
    ])
    await subscriptionDb.subscriptionHits.bulkPut([
      createHit({ id: "hit-1", subscriptionId: "sub-1" }),
      createHit({
        id: "hit-2",
        subscriptionId: "sub-2",
        detailUrl: "https://acg.rip/t/2"
      })
    ])
    await subscriptionDb.notificationRounds.put({
      id: "subscription-round:20260417110000000",
      createdAt: "2026-04-17T11:00:00.000Z",
      hitIds: ["hit-1", "hit-2"]
    })

    await replaceSubscriptionCatalog([
      createSubscription({
        id: "sub-2",
        name: "Frieren",
        titleQuery: "frieren",
        createdAt: "2026-04-02T00:00:00.000Z",
        baselineCreatedAt: "2026-04-02T00:00:00.000Z"
      })
    ])

    expect(await subscriptionDb.subscriptions.toArray()).toEqual([
      expect.objectContaining({ id: "sub-2" })
    ])
    expect(await subscriptionDb.subscriptionRuntime.toArray()).toEqual([
      expect.objectContaining({ subscriptionId: "sub-2" })
    ])
    expect(await subscriptionDb.subscriptionHits.toArray()).toEqual([
      expect.objectContaining({ id: "hit-2", subscriptionId: "sub-2" })
    ])
    expect(await subscriptionDb.notificationRounds.toArray()).toEqual([
      {
        id: "subscription-round:20260417110000000",
        createdAt: "2026-04-17T11:00:00.000Z",
        hitIds: ["hit-2"]
      }
    ])
  })

  it("preserves runtime-owned rows when only the enabled flag changes", async () => {
    await replaceSubscriptionCatalog([createSubscription({ enabled: true })])
    await subscriptionDb.subscriptionRuntime.put({
      subscriptionId: "sub-1",
      lastScanAt: "2026-04-17T10:00:00.000Z",
      lastMatchedAt: "2026-04-17T10:05:00.000Z",
      lastError: "",
      seenFingerprints: ["fp-1"]
    })
    await subscriptionDb.subscriptionHits.put(createHit())
    await subscriptionDb.notificationRounds.put({
      id: "subscription-round:20260417100000000",
      createdAt: "2026-04-17T10:00:00.000Z",
      hitIds: ["hit-1"]
    })

    await upsertSubscription(createSubscription({ enabled: false }))

    expect(await subscriptionDb.subscriptionRuntime.get("sub-1")).toEqual(
      expect.objectContaining({
        subscriptionId: "sub-1",
        seenFingerprints: ["fp-1"]
      })
    )
    expect(await subscriptionDb.subscriptionHits.get("hit-1")).toEqual(
      expect.objectContaining({
        id: "hit-1",
        subscriptionId: "sub-1"
      })
    )
    expect(await subscriptionDb.notificationRounds.toArray()).toEqual([
      expect.objectContaining({
        id: "subscription-round:20260417100000000",
        hitIds: ["hit-1"]
      })
    ])
  })
})
