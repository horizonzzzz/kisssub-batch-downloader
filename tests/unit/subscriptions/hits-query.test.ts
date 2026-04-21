import { beforeEach, describe, expect, it } from "vitest"

import {
  buildSubscriptionHitsWorkbenchRows,
  getSubscriptionHitIdsForRound,
  type SubscriptionHitsWorkbenchInput
} from "../../../src/lib/subscriptions/hits-query"
import {
  resetSubscriptionDb,
  subscriptionDb,
  upsertSubscription
} from "../../../src/lib/subscriptions"
import type { SubscriptionEntry } from "../../../src/lib/shared/types"

async function seedTestFixture() {
  const subscription1: SubscriptionEntry = {
    id: "sub-1",
    name: "ACG Medalist",
    enabled: true,
    sourceIds: ["acgrip"],
    multiSiteModeEnabled: false,
    titleQuery: "Medalist",
    subgroupQuery: "LoliHouse",
    advanced: {
      must: [],
      any: []
    },
    createdAt: "2026-04-13T00:00:00.000Z",
    baselineCreatedAt: "2026-04-13T00:00:00.000Z"
  }

  const subscription2: SubscriptionEntry = {
    id: "sub-2",
    name: "Bangumi Medalist",
    enabled: true,
    sourceIds: ["bangumimoe"],
    multiSiteModeEnabled: false,
    titleQuery: "Medalist",
    subgroupQuery: "",
    advanced: {
      must: [],
      any: []
    },
    createdAt: "2026-04-14T00:00:00.000Z",
    baselineCreatedAt: "2026-04-14T00:00:00.000Z"
  }

  await upsertSubscription(subscription1)
  await upsertSubscription(subscription2)

  await subscriptionDb.subscriptionHits.bulkPut([
    {
      id: "hit-1",
      subscriptionId: "sub-1",
      sourceId: "acgrip",
      title: "[LoliHouse] Medalist - 01 [1080p]",
      normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
      subgroup: "LoliHouse",
      detailUrl: "https://acg.rip/t/100",
      magnetUrl: "magnet:?xt=urn:btih:AAA111",
      torrentUrl: "",
      discoveredAt: "2026-04-14T08:00:00.000Z",
      downloadedAt: null,
      downloadStatus: "idle",
      readAt: null,
      resolvedAt: null
    },
    {
      id: "hit-2",
      subscriptionId: "sub-1",
      sourceId: "acgrip",
      title: "[LoliHouse] Medalist - 02 [1080p]",
      normalizedTitle: "[lolihouse] medalist - 02 [1080p]",
      subgroup: "LoliHouse",
      detailUrl: "https://acg.rip/t/101",
      magnetUrl: "magnet:?xt=urn:btih:AAA222",
      torrentUrl: "",
      discoveredAt: "2026-04-14T09:00:00.000Z",
      downloadedAt: null,
      downloadStatus: "submitted",
      readAt: null,
      resolvedAt: null
    },
    {
      id: "hit-3",
      subscriptionId: "sub-2",
      sourceId: "bangumimoe",
      title: "[VCB-Studio] Medalist [1080p]",
      normalizedTitle: "[vcb-studio] medalist [1080p]",
      subgroup: "VCB-Studio",
      detailUrl: "https://bangumi.moe/t/200",
      magnetUrl: "magnet:?xt=urn:btih:BBB111",
      torrentUrl: "",
      discoveredAt: "2026-04-14T10:00:00.000Z",
      downloadedAt: null,
      downloadStatus: "idle",
      readAt: null,
      resolvedAt: null
    }
  ])

  await subscriptionDb.notificationRounds.put({
    id: "subscription-round:20260414093000000",
    createdAt: "2026-04-14T09:30:00.000Z",
    hits: [
      {
        id: "hit-1",
        subscriptionId: "sub-1",
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 01 [1080p]",
        normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
        subgroup: "LoliHouse",
        detailUrl: "https://acg.rip/t/100",
        magnetUrl: "magnet:?xt=urn:btih:AAA111",
        torrentUrl: "",
        discoveredAt: "2026-04-14T08:00:00.000Z",
        downloadedAt: null,
        downloadStatus: "idle",
        readAt: null,
        resolvedAt: null
      }
    ]
  })
}

const defaultInput: SubscriptionHitsWorkbenchInput = {
  roundId: null,
  searchText: "",
  status: "all",
  sourceId: "all"
}

describe("hits-query", () => {
  beforeEach(async () => {
    await resetSubscriptionDb()
  })

  describe("buildSubscriptionHitsWorkbenchRows", () => {
    it("groups hits by subscription", async () => {
      await seedTestFixture()

      const rows = await buildSubscriptionHitsWorkbenchRows(defaultInput)

      expect(rows.length).toBe(2)
      expect(rows[0]?.subscription.id).toBe("sub-2")
      expect(rows[0]?.hits.length).toBe(1)
      expect(rows[1]?.subscription.id).toBe("sub-1")
      expect(rows[1]?.hits.length).toBe(2)
    })

    it("sorts hits within groups by discoveredAt descending", async () => {
      await seedTestFixture()

      const rows = await buildSubscriptionHitsWorkbenchRows(defaultInput)

      const sub1Row = rows.find((row) => row.subscription.id === "sub-1")
      expect(sub1Row?.hits[0]?.id).toBe("hit-2")
      expect(sub1Row?.hits[1]?.id).toBe("hit-1")
    })

    it("sorts groups by latest hit discoveredAt descending", async () => {
      await seedTestFixture()

      const rows = await buildSubscriptionHitsWorkbenchRows(defaultInput)

      expect(rows[0]?.subscription.id).toBe("sub-2")
      expect(rows[0]?.hits[0]?.discoveredAt).toBe("2026-04-14T10:00:00.000Z")
      expect(rows[1]?.subscription.id).toBe("sub-1")
      expect(rows[1]?.hits[0]?.discoveredAt).toBe("2026-04-14T09:00:00.000Z")
    })

    it("filters hits by search text", async () => {
      await seedTestFixture()

      const rows = await buildSubscriptionHitsWorkbenchRows({
        ...defaultInput,
        searchText: "VCB-Studio"
      })

      expect(rows.length).toBe(1)
      expect(rows[0]?.subscription.id).toBe("sub-2")
    })

    it("filters hits by source", async () => {
      await seedTestFixture()

      const rows = await buildSubscriptionHitsWorkbenchRows({
        ...defaultInput,
        sourceId: "acgrip"
      })

      expect(rows.length).toBe(1)
      expect(rows[0]?.subscription.id).toBe("sub-1")
      expect(rows[0]?.hits.length).toBe(2)
    })

    it("filters hits by status", async () => {
      await seedTestFixture()

      const rows = await buildSubscriptionHitsWorkbenchRows({
        ...defaultInput,
        status: "pending"
      })

      expect(rows.length).toBe(2)
      const allHits = rows.flatMap((row) => row.hits)
      expect(allHits.every((hit) => hit.downloadStatus === "idle")).toBe(true)
    })

    it("excludes subscriptions with no matching hits", async () => {
      await seedTestFixture()

      const rows = await buildSubscriptionHitsWorkbenchRows({
        ...defaultInput,
        searchText: "Nonexistent"
      })

      expect(rows.length).toBe(0)
    })
  })

  describe("getSubscriptionHitIdsForRound", () => {
    it("returns hit IDs from a notification round", async () => {
      await seedTestFixture()

      const hitIds = await getSubscriptionHitIdsForRound("subscription-round:20260414093000000")

      expect(hitIds).toEqual(["hit-1"])
    })

    it("returns empty array for non-existent round", async () => {
      await seedTestFixture()

      const hitIds = await getSubscriptionHitIdsForRound("nonexistent-round")

      expect(hitIds).toEqual([])
    })
  })

  describe("round highlighting", () => {
    it("marks hits as highlighted when they are in the round", async () => {
      await seedTestFixture()

      const rows = await buildSubscriptionHitsWorkbenchRows({
        ...defaultInput,
        roundId: "subscription-round:20260414093000000"
      })

      const sub1Row = rows.find((row) => row.subscription.id === "sub-1")
      const hit1 = sub1Row?.hits.find((hit) => hit.id === "hit-1")
      const hit2 = sub1Row?.hits.find((hit) => hit.id === "hit-2")

      expect(hit1?.highlighted).toBe(true)
      expect(hit2?.highlighted).toBe(false)
    })

    it("does not highlight any hits when roundId is null", async () => {
      await seedTestFixture()

      const rows = await buildSubscriptionHitsWorkbenchRows(defaultInput)

      const allHits = rows.flatMap((row) => row.hits)
      expect(allHits.every((hit) => !hit.highlighted)).toBe(true)
    })
  })
})