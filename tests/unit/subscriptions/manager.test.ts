import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type {
  SubscriptionEntry,
  SubscriptionHitRecord
} from "../../../src/lib/shared/types"
import type { SourceConfig } from "../../../src/lib/sources/config/types"
import type { DownloaderAdapter, DownloaderTorrentFile } from "../../../src/lib/downloader"
import type { SubscriptionPolicyConfig } from "../../../src/lib/subscriptions/policy/types"
import type { DownloaderConfig } from "../../../src/lib/downloader/config/types"
import { DEFAULT_SUBSCRIPTION_POLICY_CONFIG } from "../../../src/lib/subscriptions/policy/defaults"
import { DEFAULT_DOWNLOADER_CONFIG } from "../../../src/lib/downloader/config/defaults"
import { DEFAULT_SOURCE_CONFIG } from "../../../src/lib/sources/config/defaults"
import { listNotificationRounds } from "../../../src/lib/subscriptions/runtime-query"
import { resetSubscriptionDb, subscriptionDb } from "../../../src/lib/subscriptions/db"
import { SubscriptionManager } from "../../../src/lib/subscriptions/manager"
import type { SubscriptionCandidate } from "../../../src/lib/subscriptions/types"

function createSubscriptionPolicy(overrides: Partial<SubscriptionPolicyConfig> = {}): SubscriptionPolicyConfig {
  return {
    ...DEFAULT_SUBSCRIPTION_POLICY_CONFIG,
    enabled: true,
    notificationsEnabled: true,
    ...overrides
  }
}

function createDownloaderConfig(overrides: Partial<DownloaderConfig> = {}): DownloaderConfig {
  return {
    ...DEFAULT_DOWNLOADER_CONFIG,
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

function createHit(
  overrides: Partial<SubscriptionHitRecord> = {}
): SubscriptionHitRecord {
  return {
    id: "hit-1",
    subscriptionId: "sub-1",
    sourceId: "bangumimoe",
    title: "[LoliHouse] Medalist - 01 [1080p]",
    normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
    subgroup: "",
    detailUrl: "https://bangumi.moe/torrent/100",
    magnetUrl: "magnet:?xt=urn:btih:AAA111",
    torrentUrl: "",
    discoveredAt: "2026-04-14T09:30:00.000Z",
    downloadedAt: null,
    downloadStatus: "idle",
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

describe("SubscriptionManager", () => {
  beforeEach(async () => {
    await resetSubscriptionDb()
  })

  afterEach(async () => {
    await resetSubscriptionDb()
  })

  it("scans enabled subscriptions using app settings plus catalog rows and persists hits to Dexie", async () => {
    const now = "2026-04-14T08:00:00.000Z"

    await subscriptionDb.subscriptions.put(createSubscription())
    await subscriptionDb.subscriptionRuntime.put({
      subscriptionId: "sub-1",
      lastScanAt: "2026-04-14T07:30:00.000Z",
      lastMatchedAt: null,
      lastError: "",
      seenFingerprints: ["fp-old"],
      recentHits: []
    })

    const manager = new SubscriptionManager({
      subscriptionPolicy: createSubscriptionPolicy(),
      sourceConfig: createSourceConfig(),
      now: () => now
    })
    const result = await manager.scan({
      scanCandidatesFromSource: vi.fn(async () => [createCandidate()])
    })

    expect(result.newHits).toHaveLength(1)
    expect(result.notificationRound?.hits.map((hit) => hit.id)).toEqual(
      result.newHits.map((hit) => hit.id)
    )
    expect(await subscriptionDb.subscriptionRuntime.toArray()).toEqual([
      expect.objectContaining({
        subscriptionId: "sub-1",
        lastScanAt: now,
        lastMatchedAt: now,
        recentHits: [
          expect.objectContaining({
            subscriptionId: "sub-1",
            detailUrl: "https://acg.rip/t/100",
            downloadStatus: "idle"
          })
        ]
      })
    ])
    expect(await listNotificationRounds()).toEqual([
      expect.objectContaining({
        createdAt: now,
        hits: result.newHits
      })
    ])
  })

  it("downloads retained notification hits and removes the round when all actionable hits are handled", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(
      createSubscription({
        sourceIds: ["bangumimoe"]
      })
    )
    await subscriptionDb.subscriptionRuntime.put({
      subscriptionId: "sub-1",
      lastScanAt: now,
      lastMatchedAt: now,
      lastError: "",
      seenFingerprints: ["fp-1"],
      recentHits: [createHit()]
    })
    await subscriptionDb.notificationRounds.put({
      id: "subscription-round:20260414093000000",
      createdAt: now,
      hits: [createHit()]
    })

    const downloader: DownloaderAdapter = {
      id: "qbittorrent",
      displayName: "qBittorrent",
      authenticate: vi.fn(async () => undefined),
      addUrls: vi.fn(async () => ({
        entries: [
          {
            url: "magnet:?xt=urn:btih:AAA111",
            status: "submitted" as const
          }
        ]
      })),
      addTorrentFiles: vi.fn(async () => undefined),
      testConnection: vi.fn(async () => ({
        baseUrl: "http://localhost:8080",
        version: "5.0.0"
      }))
    }
    const fetchTorrentForUpload = vi.fn(
      async (): Promise<DownloaderTorrentFile> => ({
        filename: "medalist-01.torrent",
        blob: new Blob(["torrent"])
      })
    )
    const extractSingleItem = vi.fn()

    const manager = new SubscriptionManager({
      subscriptionPolicy: createSubscriptionPolicy(),
      sourceConfig: createSourceConfig()
    })
    const result = await manager.downloadFromNotification(
      { roundId: "subscription-round:20260414093000000" },
      {
        downloader,
        fetchTorrentForUpload,
        extractSingleItem,
        getDownloaderConfig: async () => createDownloaderConfig(),
        now: () => now
      }
    )

    expect(result.attemptedHits).toBe(1)
    expect(result.submittedCount).toBe(1)
    expect(result.duplicateCount).toBe(0)
    expect(result.failedCount).toBe(0)
    expect(downloader.authenticate).toHaveBeenCalledTimes(1)
    expect(await subscriptionDb.subscriptionRuntime.toArray()).toEqual([
      expect.objectContaining({
        subscriptionId: "sub-1",
        recentHits: [
          expect.objectContaining({
            id: "hit-1",
            downloadStatus: "submitted",
            downloadedAt: now
          })
        ]
      })
    ])
    await expect(listNotificationRounds()).resolves.toEqual([])
  })
})
