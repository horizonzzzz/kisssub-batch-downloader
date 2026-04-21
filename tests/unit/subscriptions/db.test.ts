import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type {
  SubscriptionEntry,
  SubscriptionHitRecord
} from "../../../src/lib/shared/types"
import {
  createSubscriptionRecord,
  listActiveSubscriptions,
  listSubscriptionsByIdsIncludingDeleted,
  listSubscriptionsIncludingDeleted,
  replaceSubscriptionCatalog,
  setSubscriptionRecordEnabled,
  softDeleteSubscriptionRecord,
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
    createdAt: "2026-04-01T00:00:00.000Z",
    baselineCreatedAt: "2026-04-01T00:00:00.000Z",
    deletedAt: null,
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
    readAt: null,
    resolvedAt: null,
    ...overrides
  }
}

describe("subscription catalog repository", () => {
  beforeEach(async () => {
    await resetSubscriptionDb()
  })

  afterEach(async () => {
    await resetSubscriptionDb()
  })

  it("soft deletes subscriptions while preserving hits and notification rounds", async () => {
    await createSubscriptionRecord(createSubscription({ id: "sub-1", titleQuery: "medalist" }))
    await createSubscriptionRecord(
      createSubscription({
        id: "sub-2",
        name: "Frieren",
        titleQuery: "frieren",
        createdAt: "2026-04-02T00:00:00.000Z",
        baselineCreatedAt: "2026-04-02T00:00:00.000Z"
      })
    )

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
      hits: [
        createHit({ id: "hit-1", subscriptionId: "sub-1" }),
        createHit({
          id: "hit-2",
          subscriptionId: "sub-2",
          detailUrl: "https://acg.rip/t/2"
        })
      ]
    })

    await softDeleteSubscriptionRecord("sub-1", "2026-04-18T00:00:00.000Z")

    await expect(listActiveSubscriptions()).resolves.toEqual([
      expect.objectContaining({ id: "sub-2" })
    ])
    await expect(listSubscriptionsIncludingDeleted()).resolves.toEqual([
      expect.objectContaining({ id: "sub-2", deletedAt: null }),
      expect.objectContaining({
        id: "sub-1",
        enabled: false,
        deletedAt: "2026-04-18T00:00:00.000Z"
      })
    ])
    await expect(listSubscriptionsByIdsIncludingDeleted(["sub-1", "sub-2"])).resolves.toEqual([
      expect.objectContaining({
        id: "sub-1",
        enabled: false,
        deletedAt: "2026-04-18T00:00:00.000Z"
      }),
      expect.objectContaining({ id: "sub-2", deletedAt: null })
    ])
    expect(await subscriptionDb.subscriptionRuntime.toArray()).toEqual([
      expect.objectContaining({ subscriptionId: "sub-2" })
    ])
    expect((await subscriptionDb.subscriptionRuntime.toArray())[0]?.recentHits).toEqual([
      expect.objectContaining({ id: "hit-2", subscriptionId: "sub-2" })
    ])
    await expect(subscriptionDb.subscriptionHits.toArray()).resolves.toEqual([
      expect.objectContaining({ id: "hit-1", subscriptionId: "sub-1" }),
      expect.objectContaining({ id: "hit-2", subscriptionId: "sub-2" })
    ])
    expect(await subscriptionDb.notificationRounds.toArray()).toEqual([
      {
        id: "subscription-round:20260417110000000",
        createdAt: "2026-04-17T11:00:00.000Z",
        hits: [
          expect.objectContaining({ id: "hit-1", subscriptionId: "sub-1" }),
          expect.objectContaining({ id: "hit-2", subscriptionId: "sub-2" })
        ]
      }
    ])
  })

  it("disables subscriptions by clearing only runtime state and preserving history", async () => {
    await createSubscriptionRecord(createSubscription({ enabled: true }))
    await subscriptionDb.subscriptionRuntime.put({
      subscriptionId: "sub-1",
      lastScanAt: "2026-04-17T10:00:00.000Z",
      lastMatchedAt: "2026-04-17T10:05:00.000Z",
      lastError: "",
      seenFingerprints: ["fp-1"],
      recentHits: [createHit()]
    })
    await subscriptionDb.subscriptionHits.put(createHit())
    await subscriptionDb.notificationRounds.put({
      id: "subscription-round:20260417100000000",
      createdAt: "2026-04-17T10:00:00.000Z",
      hits: [createHit()]
    })

    await setSubscriptionRecordEnabled("sub-1", false)

    await expect(subscriptionDb.subscriptionRuntime.get("sub-1")).resolves.toBeUndefined()
    await expect(subscriptionDb.subscriptionHits.toArray()).resolves.toEqual([
      expect.objectContaining({ id: "hit-1", subscriptionId: "sub-1" })
    ])
    await expect(subscriptionDb.notificationRounds.toArray()).resolves.toEqual([
      expect.objectContaining({
        id: "subscription-round:20260417100000000",
        hits: [expect.objectContaining({ id: "hit-1", subscriptionId: "sub-1" })]
      })
    ])
    await expect(listActiveSubscriptions()).resolves.toEqual([
      expect.objectContaining({ id: "sub-1", enabled: false, deletedAt: null })
    ])
  })

  it("does not allow stale upserts to undelete a tombstoned subscription", async () => {
    await createSubscriptionRecord(createSubscription())
    await softDeleteSubscriptionRecord("sub-1", "2026-04-18T00:00:00.000Z")

    await expect(
      upsertSubscription(createSubscription({ id: "sub-1", name: "Revived Medalist" }))
    ).rejects.toThrow("Cannot update tombstoned subscription: sub-1")

    await expect(subscriptionDb.subscriptions.get("sub-1")).resolves.toEqual(
      expect.objectContaining({
        id: "sub-1",
        name: "Medalist",
        enabled: false,
        deletedAt: "2026-04-18T00:00:00.000Z"
      })
    )
  })

  it("allows brand-new subscriptions to be created through upsert", async () => {
    await upsertSubscription(
      createSubscription({
        id: "sub-new",
        name: "New Subscription",
        titleQuery: "new subscription"
      })
    )

    await expect(subscriptionDb.subscriptions.get("sub-new")).resolves.toEqual(
      expect.objectContaining({
        id: "sub-new",
        name: "New Subscription",
        deletedAt: null
      })
    )
  })

  it("rejects upsert payloads that already carry a tombstone marker", async () => {
    await expect(
      upsertSubscription(
        createSubscription({
          id: "sub-1",
          deletedAt: "2026-04-18T00:00:00.000Z"
        })
      )
    ).rejects.toThrow("Cannot upsert tombstoned subscription: sub-1")
  })

  it("does not allow replace catalog to undelete a tombstoned subscription", async () => {
    await createSubscriptionRecord(createSubscription())
    await softDeleteSubscriptionRecord("sub-1", "2026-04-18T00:00:00.000Z")

    await expect(
      replaceSubscriptionCatalog([
        createSubscription({ id: "sub-1", name: "Revived Medalist" })
      ])
    ).rejects.toThrow("Cannot replace tombstoned subscription: sub-1")

    await expect(subscriptionDb.subscriptions.get("sub-1")).resolves.toEqual(
      expect.objectContaining({
        id: "sub-1",
        name: "Medalist",
        enabled: false,
        deletedAt: "2026-04-18T00:00:00.000Z"
      })
    )
  })

  it("rejects replace catalog payloads that already carry a tombstone marker", async () => {
    await expect(
      replaceSubscriptionCatalog([
        createSubscription({
          id: "sub-1",
          deletedAt: "2026-04-18T00:00:00.000Z"
        })
      ])
    ).rejects.toThrow(
      "Active catalog input cannot include tombstoned subscription: sub-1"
    )
  })

  it("preserves omitted tombstoned rows when replacing the active catalog", async () => {
    await createSubscriptionRecord(createSubscription({ id: "sub-1" }))
    await createSubscriptionRecord(
      createSubscription({
        id: "sub-2",
        name: "Frieren",
        titleQuery: "frieren",
        createdAt: "2026-04-02T00:00:00.000Z",
        baselineCreatedAt: "2026-04-02T00:00:00.000Z"
      })
    )
    await softDeleteSubscriptionRecord("sub-1", "2026-04-18T00:00:00.000Z")

    await replaceSubscriptionCatalog([
      createSubscription({
        id: "sub-2",
        name: "Frieren Updated",
        titleQuery: "frieren updated",
        createdAt: "2026-04-02T00:00:00.000Z",
        baselineCreatedAt: "2026-04-02T00:00:00.000Z"
      }),
      createSubscription({
        id: "sub-3",
        name: "Apothecary",
        titleQuery: "apothecary",
        createdAt: "2026-04-03T00:00:00.000Z",
        baselineCreatedAt: "2026-04-03T00:00:00.000Z"
      })
    ])

    await expect(listSubscriptionsIncludingDeleted()).resolves.toEqual([
      expect.objectContaining({ id: "sub-3", deletedAt: null }),
      expect.objectContaining({
        id: "sub-2",
        name: "Frieren Updated",
        deletedAt: null
      }),
      expect.objectContaining({
        id: "sub-1",
        enabled: false,
        deletedAt: "2026-04-18T00:00:00.000Z"
      })
    ])
  })
})
