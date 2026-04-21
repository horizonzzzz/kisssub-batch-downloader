import { beforeEach, describe, expect, it } from "vitest"

import { resetSubscriptionDb, subscriptionDb } from "../../../src/lib/subscriptions"
import {
  createSubscriptionHitId,
  getSubscriptionHitById,
  listSubscriptionHits,
  listSubscriptionHitsByIds,
  listSubscriptionHitsBySubscriptionId,
  upsertSubscriptionHits
} from "../../../src/lib/subscriptions/hit-repository"

describe("subscription hit repository", () => {
  beforeEach(async () => {
    await resetSubscriptionDb()
  })

  it("persists hit rows with read and resolution state", async () => {
    const hitId = createSubscriptionHitId("sub-1", "fp-1")

    await upsertSubscriptionHits([
      {
        id: hitId,
        subscriptionId: "sub-1",
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 01 [1080p]",
        normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
        subgroup: "LoliHouse",
        detailUrl: "https://acg.rip/t/100",
        magnetUrl: "magnet:?xt=urn:btih:AAA111",
        torrentUrl: "",
        discoveredAt: "2026-04-21T08:00:00.000Z",
        downloadedAt: null,
        downloadStatus: "idle",
        readAt: null,
        resolvedAt: null
      }
    ])

    await expect(getSubscriptionHitById(hitId)).resolves.toEqual(
      expect.objectContaining({
        id: hitId,
        readAt: null,
        resolvedAt: null
      })
    )

    await expect(listSubscriptionHitsBySubscriptionId("sub-1")).resolves.toEqual([
      expect.objectContaining({ id: hitId })
    ])
    await expect(listSubscriptionHitsByIds([hitId])).resolves.toEqual([
      expect.objectContaining({ id: hitId })
    ])
    await expect(listSubscriptionHits()).resolves.toEqual([
      expect.objectContaining({ id: hitId })
    ])
    await expect(subscriptionDb.subscriptionHits.count()).resolves.toBe(1)
  })

  it("returns hits sorted by discoveredAt descending", async () => {
    const hitId1 = createSubscriptionHitId("sub-sort", "fp-1")
    const hitId2 = createSubscriptionHitId("sub-sort", "fp-2")
    const hitId3 = createSubscriptionHitId("sub-sort", "fp-3")

    await upsertSubscriptionHits([
      {
        id: hitId1,
        subscriptionId: "sub-sort",
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 01 [1080p]",
        normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
        subgroup: "LoliHouse",
        detailUrl: "https://acg.rip/t/100",
        magnetUrl: "magnet:?xt=urn:btih:AAA111",
        torrentUrl: "",
        discoveredAt: "2026-04-21T08:00:00.000Z",
        downloadedAt: null,
        downloadStatus: "idle",
        readAt: null,
        resolvedAt: null
      },
      {
        id: hitId2,
        subscriptionId: "sub-sort",
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 02 [1080p]",
        normalizedTitle: "[lolihouse] medalist - 02 [1080p]",
        subgroup: "LoliHouse",
        detailUrl: "https://acg.rip/t/101",
        magnetUrl: "magnet:?xt=urn:btih:AAA222",
        torrentUrl: "",
        discoveredAt: "2026-04-21T10:00:00.000Z",
        downloadedAt: null,
        downloadStatus: "idle",
        readAt: null,
        resolvedAt: null
      },
      {
        id: hitId3,
        subscriptionId: "sub-sort",
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 03 [1080p]",
        normalizedTitle: "[lolihouse] medalist - 03 [1080p]",
        subgroup: "LoliHouse",
        detailUrl: "https://acg.rip/t/102",
        magnetUrl: "magnet:?xt=urn:btih:AAA333",
        torrentUrl: "",
        discoveredAt: "2026-04-21T09:00:00.000Z",
        downloadedAt: null,
        downloadStatus: "idle",
        readAt: null,
        resolvedAt: null
      }
    ])

    const hits = await listSubscriptionHitsBySubscriptionId("sub-sort")

    // Verify hits are sorted by discoveredAt descending (newest first)
    expect(hits).toHaveLength(3)
    expect(hits[0]).toEqual(expect.objectContaining({ id: hitId2 })) // 10:00 - newest
    expect(hits[1]).toEqual(expect.objectContaining({ id: hitId3 })) // 09:00 - middle
    expect(hits[2]).toEqual(expect.objectContaining({ id: hitId1 })) // 08:00 - oldest
  })
})