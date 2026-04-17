import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { AppSettings, SubscriptionEntry } from "../../../src/lib/shared/types"
import { DEFAULT_SETTINGS } from "../../../src/lib/settings/defaults"
import { resetSubscriptionDb, subscriptionDb } from "../../../src/lib/subscriptions/db"
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
})
