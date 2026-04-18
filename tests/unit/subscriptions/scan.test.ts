import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { AppSettings, SubscriptionEntry } from "../../../src/lib/shared/types"
import { DEFAULT_SETTINGS } from "../../../src/lib/settings/defaults"
import { upsertSubscription } from "../../../src/lib/subscriptions/catalog-repository"
import { resetSubscriptionDb, subscriptionDb } from "../../../src/lib/subscriptions/db"
import { RECENT_HIT_RETENTION_CAP } from "../../../src/lib/subscriptions/retention"
import { scanSubscriptions } from "../../../src/lib/subscriptions/scan"
import type { SubscriptionCandidate } from "../../../src/lib/subscriptions/types"

function createAppSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    subscriptionsEnabled: true,
    notificationsEnabled: true,
    ...overrides
  }
}

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

function createCandidate(
  overrides: Partial<SubscriptionCandidate> = {}
): SubscriptionCandidate {
  return {
    sourceId: "acgrip",
    title: "[LoliHouse] Medalist - 01 [1080p]",
    normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
    detailUrl: "https://acg.rip/t/100",
    magnetUrl: "",
    torrentUrl: "https://acg.rip/t/100.torrent",
    subgroup: "",
    ...overrides
  }
}

function createStoredHit(index: number) {
  return {
    id: `hit-${index}`,
    subscriptionId: "sub-1",
    sourceId: "acgrip" as const,
    title: `Medalist ${index}`,
    normalizedTitle: `medalist ${index}`,
    subgroup: "",
    detailUrl: `https://acg.rip/t/${index}`,
    magnetUrl: "",
    torrentUrl: `https://acg.rip/t/${index}.torrent`,
    discoveredAt: `2026-04-14T07:${String(index).padStart(2, "0")}:00.000Z`,
    downloadedAt: null,
    downloadStatus: "idle" as const
  }
}

describe("scanSubscriptions", () => {
  beforeEach(async () => {
    await resetSubscriptionDb()
  })

  afterEach(async () => {
    await resetSubscriptionDb()
  })

  it("records first-scan fingerprints without emitting notification hits", async () => {
    const now = "2026-04-14T08:00:00.000Z"
    const subscription = createSubscription()

    const result = await scanSubscriptions({
      appSettings: createAppSettings(),
      subscriptions: [subscription],
      now: () => now,
      scanCandidatesFromSource: vi.fn(async () => [createCandidate()])
    })

    expect(result.newHits).toEqual([])
    expect(result.notificationRound).toBeNull()
    expect(await subscriptionDb.subscriptionRuntime.toArray()).toEqual([
      expect.objectContaining({
        subscriptionId: "sub-1",
        lastScanAt: now,
        lastMatchedAt: now,
        seenFingerprints: expect.arrayContaining([expect.any(String)])
      })
    ])
  })

  it("records scan errors on normalized runtime rows", async () => {
    const now = "2026-04-14T08:30:00.000Z"
    const subscription = createSubscription()

    const result = await scanSubscriptions({
      appSettings: createAppSettings(),
      subscriptions: [subscription],
      now: () => now,
      scanCandidatesFromSource: vi.fn(async () => {
        throw new Error("scan exploded")
      })
    })

    expect(result.errors).toEqual([
      {
        sourceId: "acgrip",
        error: "scan exploded"
      }
    ])
    expect(await subscriptionDb.subscriptionRuntime.toArray()).toEqual([
      expect.objectContaining({
        subscriptionId: "sub-1",
        lastScanAt: now,
        lastError: "scan exploded"
      })
    ])
  })

  it("caps persisted recent hits per subscription instead of appending forever", async () => {
    const now = "2026-04-14T08:45:00.000Z"
    const subscription = createSubscription()
    const existingHits = Array.from({ length: RECENT_HIT_RETENTION_CAP }, (_, index) =>
      createStoredHit(index + 1)
    )

    await subscriptionDb.subscriptionRuntime.put({
      subscriptionId: "sub-1",
      lastScanAt: "2026-04-14T08:00:00.000Z",
      lastMatchedAt: "2026-04-14T08:00:00.000Z",
      lastError: "",
      seenFingerprints: ["fp-old"],
      recentHits: existingHits
    })

    const result = await scanSubscriptions({
      appSettings: createAppSettings(),
      subscriptions: [subscription],
      now: () => now,
      scanCandidatesFromSource: vi.fn(async () => [
        createCandidate({
          title: "[LoliHouse] Medalist - 21 [1080p]",
          normalizedTitle: "[lolihouse] medalist - 21 [1080p]",
          detailUrl: "https://acg.rip/t/2100",
          torrentUrl: "https://acg.rip/t/2100.torrent"
        })
      ])
    })

    expect(result.newHits).toHaveLength(1)
    await expect(subscriptionDb.subscriptionRuntime.get("sub-1")).resolves.toEqual(
      expect.objectContaining({
        subscriptionId: "sub-1",
        recentHits: expect.arrayContaining([
          expect.objectContaining({
            detailUrl: "https://acg.rip/t/2100"
          })
        ])
      })
    )

    const runtimeRow = await subscriptionDb.subscriptionRuntime.get("sub-1")
    expect(runtimeRow?.recentHits).toHaveLength(RECENT_HIT_RETENTION_CAP)
    expect(runtimeRow?.recentHits.some((hit) => hit.id === "hit-1")).toBe(false)
  })

  it("rebuilds the observation baseline after a subscription is re-enabled", async () => {
    const initialNow = "2026-04-14T08:00:00.000Z"
    const resumedNow = "2026-04-14T09:00:00.000Z"
    const enabledSubscription = createSubscription({ enabled: true })

    await upsertSubscription(enabledSubscription)
    await scanSubscriptions({
      appSettings: createAppSettings(),
      subscriptions: [enabledSubscription],
      now: () => initialNow,
      scanCandidatesFromSource: vi.fn(async () => [createCandidate()])
    })

    await upsertSubscription({
      ...enabledSubscription,
      enabled: false
    })
    await upsertSubscription(enabledSubscription)

    const resumedResult = await scanSubscriptions({
      appSettings: createAppSettings(),
      subscriptions: [enabledSubscription],
      now: () => resumedNow,
      scanCandidatesFromSource: vi.fn(async () => [
        createCandidate(),
        createCandidate({
          title: "[LoliHouse] Medalist - 02 [1080p]",
          normalizedTitle: "[lolihouse] medalist - 02 [1080p]",
          detailUrl: "https://acg.rip/t/101",
          torrentUrl: "https://acg.rip/t/101.torrent"
        })
      ])
    })

    expect(resumedResult.newHits).toEqual([])
    expect(resumedResult.notificationRound).toBeNull()
    await expect(subscriptionDb.subscriptionRuntime.get("sub-1")).resolves.toEqual(
      expect.objectContaining({
        subscriptionId: "sub-1",
        lastScanAt: resumedNow,
        lastMatchedAt: resumedNow,
        seenFingerprints: expect.arrayContaining([expect.any(String), expect.any(String)])
      })
    )
  })
})
