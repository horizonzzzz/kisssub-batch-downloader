import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { SubscriptionEntry } from "../../../src/lib/shared/types"
import type { SubscriptionPolicyConfig } from "../../../src/lib/subscriptions/policy/types"
import { DEFAULT_SUBSCRIPTION_POLICY_CONFIG } from "../../../src/lib/subscriptions/policy/defaults"
import {
  clearPendingSubscriptionNotifications,
  executeSubscriptionScan,
  upsertSubscriptionDefinition
} from "../../../src/lib/background/subscriptions"
import { listSubscriptions } from "../../../src/lib/subscriptions/catalog-repository"
import { resetSubscriptionDb, subscriptionDb } from "../../../src/lib/subscriptions/db"
import type { SubscriptionCandidate } from "../../../src/lib/subscriptions/types"

function createSubscriptionPolicy(overrides: Partial<SubscriptionPolicyConfig> = {}): SubscriptionPolicyConfig {
  return {
    ...DEFAULT_SUBSCRIPTION_POLICY_CONFIG,
    enabled: true,
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

describe("background subscriptions bridge", () => {
  beforeEach(async () => {
    await resetSubscriptionDb()
  })

  afterEach(async () => {
    await resetSubscriptionDb()
  })

  it("upserts subscription definitions without touching app-settings persistence", async () => {
    const saveSettings = vi.fn()

    await upsertSubscriptionDefinition(createSubscription(), {
      getSettings: async () => createSubscriptionPolicy(),
      saveSettings
    })

    expect(saveSettings).not.toHaveBeenCalled()
    await expect(listSubscriptions()).resolves.toEqual([
      expect.objectContaining({ id: "sub-1" })
    ])
  })

  it("creates browser notifications after scans when app settings enable notifications", async () => {
    const createNotification = vi.fn(async () => undefined)

    await upsertSubscriptionDefinition(createSubscription(), {
      getSettings: async () => createSubscriptionPolicy()
    })
    await subscriptionDb.subscriptionRuntime.put({
      subscriptionId: "sub-1",
      lastScanAt: "2026-04-14T07:30:00.000Z",
      lastMatchedAt: null,
      lastError: "",
      seenFingerprints: ["fp-old"],
      recentHits: []
    })

    const result = await executeSubscriptionScan({
      getSubscriptionPolicy: async () => createSubscriptionPolicy({
        notificationsEnabled: true
      }),
      createNotification,
      now: () => "2026-04-14T08:00:00.000Z",
      scanCandidatesFromSource: vi.fn(async () => [createCandidate()])
    })

    expect(result.newHits).toHaveLength(1)
    expect(createNotification).toHaveBeenCalledTimes(1)
  })

  it("clears persisted notification rounds and browser notifications together", async () => {
    const clearBrowserNotification = vi.fn(async () => true)

    await subscriptionDb.notificationRounds.bulkPut([
      {
        id: "subscription-round:20260414080000000",
        createdAt: "2026-04-14T08:00:00.000Z",
        hits: []
      },
      {
        id: "subscription-round:20260414090000000",
        createdAt: "2026-04-14T09:00:00.000Z",
        hits: []
      }
    ])

    await clearPendingSubscriptionNotifications({
      clearBrowserNotification
    })

    await expect(subscriptionDb.notificationRounds.toArray()).resolves.toEqual([])
    expect(clearBrowserNotification).toHaveBeenCalledTimes(2)
    expect(clearBrowserNotification).toHaveBeenCalledWith("subscription-round:20260414080000000")
    expect(clearBrowserNotification).toHaveBeenCalledWith("subscription-round:20260414090000000")
  })
})
