import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { AppSettings, SubscriptionEntry } from "../../../src/lib/shared/types"
import { DEFAULT_SETTINGS } from "../../../src/lib/settings/defaults"
import {
  executeSubscriptionScan,
  upsertSubscriptionDefinition
} from "../../../src/lib/background/subscriptions"
import { listSubscriptions } from "../../../src/lib/subscriptions/catalog-repository"
import { resetSubscriptionDb, subscriptionDb } from "../../../src/lib/subscriptions/db"
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
      getSettings: async () => createAppSettings(),
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
      getSettings: async () => createAppSettings()
    })
    await subscriptionDb.subscriptionRuntime.put({
      subscriptionId: "sub-1",
      lastScanAt: "2026-04-14T07:30:00.000Z",
      lastMatchedAt: null,
      lastError: "",
      seenFingerprints: ["fp-old"]
    })

    const result = await executeSubscriptionScan({
      getSettings: async () => createAppSettings({
        notificationsEnabled: true
      }),
      createNotification,
      now: () => "2026-04-14T08:00:00.000Z",
      scanCandidatesFromSource: vi.fn(async () => [createCandidate()])
    })

    expect(result.newHits).toHaveLength(1)
    expect(createNotification).toHaveBeenCalledTimes(1)
  })
})
