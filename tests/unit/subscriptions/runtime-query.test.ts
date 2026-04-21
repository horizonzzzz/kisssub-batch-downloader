import { afterEach, beforeEach, describe, expect, it } from "vitest"

import type {
  SubscriptionEntry,
  SubscriptionHitRecord
} from "../../../src/lib/shared/types"
import {
  resetSubscriptionDb,
  subscriptionDb
} from "../../../src/lib/subscriptions/db"
import {
  buildSubscriptionDashboardRows,
  listNotificationRounds
} from "../../../src/lib/subscriptions/runtime-query"

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

describe("subscription runtime query", () => {
  beforeEach(async () => {
    await resetSubscriptionDb()
  })

  afterEach(async () => {
    await resetSubscriptionDb()
  })

  it("builds dashboard rows from normalized subscription tables", async () => {
    await subscriptionDb.subscriptions.bulkPut([
      createSubscription({
        id: "sub-1",
        name: "Medalist",
        createdAt: "2026-04-01T00:00:00.000Z",
        baselineCreatedAt: "2026-04-01T00:00:00.000Z"
      }),
      createSubscription({
        id: "sub-2",
        name: "Frieren",
        titleQuery: "frieren",
        createdAt: "2026-04-02T00:00:00.000Z",
        baselineCreatedAt: "2026-04-02T00:00:00.000Z"
      })
    ])
    await subscriptionDb.subscriptionRuntime.put({
      subscriptionId: "sub-1",
      lastScanAt: "2026-04-17T10:00:00.000Z",
      lastMatchedAt: "2026-04-17T10:00:00.000Z",
      lastError: "",
      seenFingerprints: ["fp-1", "fp-2"],
      recentHits: [
        createHit({ id: "hit-1", subscriptionId: "sub-1" }),
        createHit({
          id: "hit-2",
          subscriptionId: "sub-1",
          discoveredAt: "2026-04-17T11:00:00.000Z",
          detailUrl: "https://acg.rip/t/2"
        })
      ]
    })
    await subscriptionDb.subscriptionRuntime.put({
      subscriptionId: "sub-2",
      lastScanAt: null,
      lastMatchedAt: null,
      lastError: "",
      seenFingerprints: [],
      recentHits: [
        createHit({
          id: "hit-3",
          subscriptionId: "sub-2",
          discoveredAt: "2026-04-17T09:00:00.000Z",
          detailUrl: "https://acg.rip/t/3"
        })
      ]
    })

    const rows = await buildSubscriptionDashboardRows()

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      subscription: expect.objectContaining({ id: "sub-2" }),
      runtime: expect.objectContaining({
        subscriptionId: "sub-2",
        lastScanAt: null
      }),
      recentHits: [expect.objectContaining({ id: "hit-3", subscriptionId: "sub-2" })]
    })
    expect(rows[1]).toMatchObject({
      subscription: expect.objectContaining({ id: "sub-1" }),
      runtime: expect.objectContaining({
        subscriptionId: "sub-1",
        lastScanAt: "2026-04-17T10:00:00.000Z"
      })
    })
    expect(rows[1]?.recentHits.map((hit) => hit.id)).toEqual(["hit-1", "hit-2"])
  })

  it("reads notification rounds with embedded hit payloads", async () => {
    await subscriptionDb.notificationRounds.put({
      id: "subscription-round:20260417110000000",
      createdAt: "2026-04-17T11:00:00.000Z",
      hits: [
        createHit({
          id: "hit-2",
          discoveredAt: "2026-04-17T11:00:00.000Z",
          detailUrl: "https://acg.rip/t/2"
        }),
        createHit({ id: "hit-1", discoveredAt: "2026-04-17T10:00:00.000Z" })
      ]
    })

    const rounds = await listNotificationRounds()

    expect(rounds).toEqual([
      {
        id: "subscription-round:20260417110000000",
        createdAt: "2026-04-17T11:00:00.000Z",
        hits: [
          expect.objectContaining({ id: "hit-2" }),
          expect.objectContaining({ id: "hit-1" })
        ]
      }
    ])
  })
})
