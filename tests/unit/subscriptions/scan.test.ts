import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest"

import type { SubscriptionEntry, DeliveryMode } from "../../../src/lib/shared/types"
import type { SourceConfig } from "../../../src/lib/sources/config/types"
import type { ScanSubscriptionListResultMessage } from "../../../src/lib/shared/messages"
import type { SubscriptionPolicyConfig } from "../../../src/lib/subscriptions/policy/types"
import { DEFAULT_SUBSCRIPTION_POLICY_CONFIG } from "../../../src/lib/subscriptions/policy/defaults"
import { DEFAULT_SOURCE_CONFIG } from "../../../src/lib/sources/config/defaults"
import { upsertSubscription } from "../../../src/lib/subscriptions/catalog-repository"
import { markContentScriptReady, resetContentScriptReadyRegistry } from "../../../src/lib/subscriptions/content-ready"
import { resetSubscriptionDb, subscriptionDb } from "../../../src/lib/subscriptions/db"
import { RECENT_HIT_RETENTION_CAP } from "../../../src/lib/subscriptions/retention"
import { scanSubscriptions } from "../../../src/lib/subscriptions/scan"
import { scanSubscriptionCandidatesFromSource } from "../../../src/lib/subscriptions/source-scan"
import type { SubscriptionCandidate } from "../../../src/lib/subscriptions/types"
import type { SourceSubscriptionScanCandidate } from "../../../src/lib/sources/types"
import { SCAN_SUBSCRIPTION_LIST_REQUEST } from "../../../src/lib/shared/messages"

function createSubscriptionPolicy(overrides: Partial<SubscriptionPolicyConfig> = {}): SubscriptionPolicyConfig {
  return {
    ...DEFAULT_SUBSCRIPTION_POLICY_CONFIG,
    enabled: true,
    notificationsEnabled: true,
    ...overrides
  }
}

function createSourceConfig(overrides: Partial<SourceConfig> = {}): SourceConfig {
  return {
    ...DEFAULT_SOURCE_CONFIG,
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
    resetContentScriptReadyRegistry()
  })

  afterEach(async () => {
    await resetSubscriptionDb()
    resetContentScriptReadyRegistry()
  })

  it("defines the typed response protocol for content script subscription scan results", () => {
    // Protocol type contract: content runtime returns typed success/error responses
    // with normalized candidate data instead of raw executeScript results
    expectTypeOf<ScanSubscriptionListResultMessage>().toMatchTypeOf<
      | {
          ok: true
          candidates: SourceSubscriptionScanCandidate[]
        }
      | {
          ok: false
          error: string
        }
    >()
  })

  it("records first-scan fingerprints without emitting notification hits", async () => {
    const now = "2026-04-14T08:00:00.000Z"
    const subscription = createSubscription()

    const result = await scanSubscriptions({
      subscriptionPolicy: createSubscriptionPolicy(),
      sourceConfig: createSourceConfig(),
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
      subscriptionPolicy: createSubscriptionPolicy(),
      sourceConfig: createSourceConfig(),
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
      subscriptionPolicy: createSubscriptionPolicy(),
      sourceConfig: createSourceConfig(),
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
      subscriptionPolicy: createSubscriptionPolicy(),
      sourceConfig: createSourceConfig(),
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
      subscriptionPolicy: createSubscriptionPolicy(),
      sourceConfig: createSourceConfig(),
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

describe("scanSubscriptionCandidatesFromSource", () => {
  beforeEach(() => {
    resetContentScriptReadyRegistry()
  })

  it("requests candidates from the content runtime instead of executeScript", async () => {
    const mockSendMessageToTab = vi.fn(async () => ({
      ok: true as const,
      candidates: [
        {
          sourceId: "acgrip" as const,
          title: "[LoliHouse] Medalist - 01 [1080p]",
          detailUrl: "https://acg.rip/t/100",
          magnetUrl: "",
          torrentUrl: "https://acg.rip/t/100.torrent",
          subgroup: ""
        }
      ]
    }))

    const mockGetAdapterById = vi.fn(() => ({
      id: "acgrip" as const,
      displayName: "ACG.RIP",
      supportedDeliveryModes: ["magnet", "torrent-url"] as DeliveryMode[],
      defaultDeliveryMode: "torrent-url" as DeliveryMode,
      subscriptionListScan: {
        listPageUrl: "https://acg.rip/"
      },
      matchesListPage: vi.fn(() => false),
      matchesDetailUrl: vi.fn((url: URL) => /\/t\/\d+$/i.test(url.pathname)),
      getDetailAnchors: vi.fn(() => []),
      getBatchItemFromAnchor: vi.fn(() => null),
      extractSingleItem: vi.fn(async () => ({ ok: false, title: "", detailUrl: "", hash: "", magnetUrl: "", torrentUrl: "", failureReason: "" }))
    }))

    const mockRunWithListPageTab = vi.fn(async (_listPageUrl: string, run: (tabId: number) => Promise<any>) => {
      return run(12)
    })

    await scanSubscriptionCandidatesFromSource("acgrip", {
      getAdapterById: mockGetAdapterById,
      runWithListPageTab: mockRunWithListPageTab,
      sendMessageToTab: mockSendMessageToTab,
      waitForContentScriptReady: vi.fn(async () => {})
    })

    expect(mockSendMessageToTab).toHaveBeenCalledWith(12, {
      type: SCAN_SUBSCRIPTION_LIST_REQUEST,
      sourceId: "acgrip"
    })
  })

  it("waits for content script ready signal before requesting scan", async () => {
    const mockWaitForReady = vi.fn(async () => {})
    const mockSendMessageToTab = vi.fn(async () => ({
      ok: true as const,
      candidates: []
    }))

    const mockGetAdapterById = vi.fn(() => ({
      id: "acgrip" as const,
      displayName: "ACG.RIP",
      supportedDeliveryModes: ["magnet", "torrent-url"] as DeliveryMode[],
      defaultDeliveryMode: "torrent-url" as DeliveryMode,
      subscriptionListScan: {
        listPageUrl: "https://acg.rip/"
      },
      matchesListPage: vi.fn(() => false),
      matchesDetailUrl: vi.fn((url: URL) => /\/t\/\d+$/i.test(url.pathname)),
      getDetailAnchors: vi.fn(() => []),
      getBatchItemFromAnchor: vi.fn(() => null),
      extractSingleItem: vi.fn(async () => ({ ok: false, title: "", detailUrl: "", hash: "", magnetUrl: "", torrentUrl: "", failureReason: "" }))
    }))

    const mockRunWithListPageTab = vi.fn(async (_listPageUrl: string, run: (tabId: number) => Promise<any>) => {
      return run(12)
    })

    await scanSubscriptionCandidatesFromSource("acgrip", {
      getAdapterById: mockGetAdapterById,
      runWithListPageTab: mockRunWithListPageTab,
      sendMessageToTab: mockSendMessageToTab,
      waitForContentScriptReady: mockWaitForReady
    })

    expect(mockWaitForReady).toHaveBeenCalledWith(12, "acgrip")
    expect(mockSendMessageToTab).toHaveBeenCalledAfter(mockWaitForReady)
  })

  it("handles scan errors from content runtime", async () => {
    const mockSendMessageToTab = vi.fn(async () => ({
      ok: false as const,
      error: "Failed to parse list page structure"
    }))

    const mockGetAdapterById = vi.fn(() => ({
      id: "acgrip" as const,
      displayName: "ACG.RIP",
      supportedDeliveryModes: ["magnet", "torrent-url"] as DeliveryMode[],
      defaultDeliveryMode: "torrent-url" as DeliveryMode,
      subscriptionListScan: {
        listPageUrl: "https://acg.rip/"
      },
      matchesListPage: vi.fn(() => false),
      matchesDetailUrl: vi.fn((url: URL) => /\/t\/\d+$/i.test(url.pathname)),
      getDetailAnchors: vi.fn(() => []),
      getBatchItemFromAnchor: vi.fn(() => null),
      extractSingleItem: vi.fn(async () => ({ ok: false, title: "", detailUrl: "", hash: "", magnetUrl: "", torrentUrl: "", failureReason: "" }))
    }))

    const mockRunWithListPageTab = vi.fn(async (_listPageUrl: string, run: (tabId: number) => Promise<any>) => {
      return run(12)
    })

    await expect(
      scanSubscriptionCandidatesFromSource("acgrip", {
        getAdapterById: mockGetAdapterById,
        runWithListPageTab: mockRunWithListPageTab,
        sendMessageToTab: mockSendMessageToTab,
        waitForContentScriptReady: vi.fn(async () => {})
      })
    ).rejects.toThrow("Failed to parse list page structure")
  })

  it("consumes a ready signal that arrived before source-scan started waiting", async () => {
    const mockSendMessageToTab = vi.fn(async () => ({
      ok: true as const,
      candidates: [
        {
          sourceId: "acgrip" as const,
          title: "[LoliHouse] Medalist - 01 [1080p]",
          detailUrl: "https://acg.rip/t/100",
          magnetUrl: "",
          torrentUrl: "https://acg.rip/t/100.torrent",
          subgroup: ""
        }
      ]
    }))

    const mockGetAdapterById = vi.fn(() => ({
      id: "acgrip" as const,
      displayName: "ACG.RIP",
      supportedDeliveryModes: ["magnet", "torrent-url"] as DeliveryMode[],
      defaultDeliveryMode: "torrent-url" as DeliveryMode,
      subscriptionListScan: {
        listPageUrl: "https://acg.rip/"
      },
      matchesListPage: vi.fn(() => false),
      matchesDetailUrl: vi.fn((url: URL) => /\/t\/\d+$/i.test(url.pathname)),
      getDetailAnchors: vi.fn(() => []),
      getBatchItemFromAnchor: vi.fn(() => null),
      extractSingleItem: vi.fn(async () => ({ ok: false, title: "", detailUrl: "", hash: "", magnetUrl: "", torrentUrl: "", failureReason: "" }))
    }))

    const mockRunWithListPageTab = vi.fn(async (_listPageUrl: string, run: (tabId: number) => Promise<any>) => {
      markContentScriptReady(12, "acgrip")
      return run(12)
    })

    await expect(
      scanSubscriptionCandidatesFromSource("acgrip", {
        getAdapterById: mockGetAdapterById,
        runWithListPageTab: mockRunWithListPageTab,
        sendMessageToTab: mockSendMessageToTab
      })
    ).resolves.toEqual([
      expect.objectContaining({
        sourceId: "acgrip",
        detailUrl: "https://acg.rip/t/100"
      })
    ])
  })
})
