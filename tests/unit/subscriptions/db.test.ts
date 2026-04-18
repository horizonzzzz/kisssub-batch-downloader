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
        seenFingerprints: ["fp-1"],
        recentHits: [createHit({ id: "hit-1", subscriptionId: "sub-1" })]
      },
      {
        subscriptionId: "sub-2",
        lastScanAt: "2026-04-17T11:00:00.000Z",
        lastMatchedAt: null,
        lastError: "",
        seenFingerprints: ["fp-2"],
        recentHits: [
          createHit({
            id: "hit-2",
            subscriptionId: "sub-2",
            detailUrl: "https://acg.rip/t/2"
          })
        ]
      }
    ])
    await subscriptionDb.notificationRounds.put({
      id: "subscription-round:20260417110000000",
      createdAt: "2026-04-17T11:00:00.000Z",
      hits: [
        createHit({ id: "hit-1", subscriptionId: "sub-1" }),
        createHit({
          id: "hit-2",
          subscriptionId: "sub-2",
          detailUrl: "https://acg.rip/t/2"
        })
      ]
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
    expect((await subscriptionDb.subscriptionRuntime.toArray())[0]?.recentHits).toEqual([
      expect.objectContaining({ id: "hit-2", subscriptionId: "sub-2" })
    ])
    expect(await subscriptionDb.notificationRounds.toArray()).toEqual([
      {
        id: "subscription-round:20260417110000000",
        createdAt: "2026-04-17T11:00:00.000Z",
        hits: [expect.objectContaining({ id: "hit-2" })]
      }
    ])
  })

  it("prunes runtime-owned rows when a subscription is disabled", async () => {
    await replaceSubscriptionCatalog([createSubscription({ enabled: true })])
    await subscriptionDb.subscriptionRuntime.put({
      subscriptionId: "sub-1",
      lastScanAt: "2026-04-17T10:00:00.000Z",
      lastMatchedAt: "2026-04-17T10:05:00.000Z",
      lastError: "",
      seenFingerprints: ["fp-1"],
      recentHits: [createHit()]
    })
    await subscriptionDb.notificationRounds.put({
      id: "subscription-round:20260417100000000",
      createdAt: "2026-04-17T10:00:00.000Z",
      hits: [createHit()]
    })

    await upsertSubscription(createSubscription({ enabled: false }))

    await expect(subscriptionDb.subscriptionRuntime.get("sub-1")).resolves.toBeUndefined()
    await expect(subscriptionDb.notificationRounds.toArray()).resolves.toEqual([])
  })
})
