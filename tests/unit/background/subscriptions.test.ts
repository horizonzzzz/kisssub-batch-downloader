import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { SubscriptionEntry, SubscriptionHitRecord } from "../../../src/lib/shared/types"
import type { SubscriptionPolicyConfig } from "../../../src/lib/subscriptions/policy/types"
import type { SourceConfig } from "../../../src/lib/sources/config/types"
import type { DownloaderAdapter, DownloaderTorrentFile } from "../../../src/lib/downloader"
import type { DownloaderConfig } from "../../../src/lib/downloader/config/types"
import { DEFAULT_SUBSCRIPTION_POLICY_CONFIG } from "../../../src/lib/subscriptions/policy/defaults"
import { DEFAULT_DOWNLOADER_CONFIG } from "../../../src/lib/downloader/config/defaults"
import { DEFAULT_SOURCE_CONFIG } from "../../../src/lib/sources/config/defaults"
import {
  clearPendingSubscriptionNotifications,
  executeSubscriptionScan,
  upsertSubscriptionDefinition,
  downloadSubscriptionHitsBySelection
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
    deletedAt: null,
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

function createHit(
  overrides: Partial<SubscriptionHitRecord> = {}
): SubscriptionHitRecord {
  return {
    id: "hit-1",
    subscriptionId: "sub-1",
    sourceId: "acgrip",
    title: "[LoliHouse] Medalist - 01 [1080p]",
    normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
    subgroup: "",
    detailUrl: "https://acg.rip/t/100",
    magnetUrl: "magnet:?xt=urn:btih:AAA111",
    torrentUrl: "",
    discoveredAt: "2026-04-14T09:30:00.000Z",
    downloadedAt: null,
    downloadStatus: "idle",
    readAt: null,
    resolvedAt: null,
    ...overrides
  }
}

function createDownloader(): DownloaderAdapter {
  return {
    id: "qbittorrent",
    displayName: "qBittorrent",
    authenticate: vi.fn(async () => undefined),
    addUrls: vi.fn(async () => ({ entries: [] })),
    addTorrentFiles: vi.fn(async () => undefined),
    testConnection: vi.fn(async () => ({
      baseUrl: "http://localhost:8080",
      version: "5.0.0"
    }))
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

  it("downloads hits by selection from the subscription hits table", async () => {
    const now = "2026-04-14T09:30:00.000Z"
    const ensureDownloaderPermission = vi.fn(async () => undefined)

    await subscriptionDb.subscriptions.put(createSubscription({
      sourceIds: ["bangumimoe"]
    }))
    await subscriptionDb.subscriptionRuntime.put({
      subscriptionId: "sub-1",
      lastScanAt: "2026-04-14T08:00:00.000Z",
      lastMatchedAt: "2026-04-14T08:00:00.000Z",
      lastError: "",
      seenFingerprints: ["fp-1"],
      recentHits: [createHit({ id: "hit-1", sourceId: "bangumimoe", detailUrl: "https://bangumi.moe/torrent/100" })]
    })
    await subscriptionDb.subscriptionHits.bulkPut([
      createHit({ id: "hit-1", sourceId: "bangumimoe", detailUrl: "https://bangumi.moe/torrent/100" }),
      createHit({ id: "hit-2", sourceId: "bangumimoe", magnetUrl: "magnet:?xt=urn:btih:AAA222", detailUrl: "https://bangumi.moe/torrent/101" }),
      createHit({ id: "hit-3", sourceId: "bangumimoe", magnetUrl: "magnet:?xt=urn:btih:AAA333", detailUrl: "https://bangumi.moe/torrent/102" })
    ])

    const downloader = createDownloader()
    downloader.addUrls = vi.fn(async () => ({
      entries: [{ url: "magnet:?xt=urn:btih:AAA111", status: "submitted" as const }]
    }))

    const result = await downloadSubscriptionHitsBySelection(
      { hitIds: ["hit-1"] },
      {
        getSubscriptionPolicy: async () => createSubscriptionPolicy(),
        getSourceConfig: async () => createSourceConfig(),
        getDownloaderConfig: async () => createDownloaderConfig(),
        getDownloader: () => downloader,
        ensureDownloaderPermission,
        fetchTorrentForUpload: vi.fn(async (): Promise<DownloaderTorrentFile> => ({
          filename: "test.torrent",
          blob: new Blob(["torrent"])
        })),
        extractSingleItem: vi.fn(),
        now: () => now
      }
    )

    expect(result.attemptedHits).toBe(1)
    expect(result.submittedHits).toBe(1)
    expect(ensureDownloaderPermission).toHaveBeenCalledWith(createDownloaderConfig())
    expect(downloader.authenticate).toHaveBeenCalledTimes(1)
    expect(await subscriptionDb.subscriptionHits.get("hit-1")).toEqual(
      expect.objectContaining({
        downloadStatus: "submitted",
        downloadedAt: now,
        resolvedAt: now
      })
    )
    expect(await subscriptionDb.subscriptionRuntime.get("sub-1")).toEqual(
      expect.objectContaining({
        recentHits: [
          expect.objectContaining({
            id: "hit-1",
            downloadStatus: "submitted",
            downloadedAt: now,
            resolvedAt: now
          })
        ]
      })
    )
  })

  it("downloads selected historical hits even when the subscription is disabled and the source is disabled", async () => {
    const now = "2026-04-14T09:30:00.000Z"
    const ensureDownloaderPermission = vi.fn(async () => undefined)

    await subscriptionDb.subscriptions.put(createSubscription({
      sourceIds: ["bangumimoe"],
      enabled: false,
      deletedAt: "2026-04-15T09:30:00.000Z"
    }))
    await subscriptionDb.subscriptionHits.put(
      createHit({
        id: "hit-disabled",
        subscriptionId: "sub-1",
        sourceId: "bangumimoe",
        detailUrl: "https://bangumi.moe/torrent/100"
      })
    )

    const downloader = createDownloader()
    downloader.addUrls = vi.fn(async () => ({
      entries: [{ url: "magnet:?xt=urn:btih:AAA111", status: "submitted" as const }]
    }))

    const result = await downloadSubscriptionHitsBySelection(
      { hitIds: ["hit-disabled"] },
      {
        getSubscriptionPolicy: async () => createSubscriptionPolicy(),
        getSourceConfig: async () => createSourceConfig({
          bangumimoe: {
            ...DEFAULT_SOURCE_CONFIG.bangumimoe,
            enabled: false
          }
        }),
        getDownloaderConfig: async () => createDownloaderConfig(),
        getDownloader: () => downloader,
        ensureDownloaderPermission,
        fetchTorrentForUpload: vi.fn(async (): Promise<DownloaderTorrentFile> => ({
          filename: "test.torrent",
          blob: new Blob(["torrent"])
        })),
        extractSingleItem: vi.fn(),
        now: () => now
      }
    )

    expect(result.attemptedHits).toBe(1)
    expect(result.submittedHits).toBe(1)
    expect(ensureDownloaderPermission).toHaveBeenCalledWith(createDownloaderConfig())
    expect(downloader.authenticate).toHaveBeenCalledTimes(1)
    expect(await subscriptionDb.subscriptionHits.get("hit-disabled")).toEqual(
      expect.objectContaining({
        downloadStatus: "submitted",
        downloadedAt: now,
        resolvedAt: now
      })
    )
  })

  it("prunes resolved hits from the originating notification round when selection downloads include round context", async () => {
    const now = "2026-04-14T09:30:00.000Z"
    const ensureDownloaderPermission = vi.fn(async () => undefined)

    await subscriptionDb.subscriptions.put(createSubscription({
      sourceIds: ["bangumimoe"]
    }))
    await subscriptionDb.subscriptionHits.bulkPut([
      createHit({ id: "hit-1", sourceId: "bangumimoe", detailUrl: "https://bangumi.moe/torrent/100" }),
      createHit({ id: "hit-2", sourceId: "bangumimoe", magnetUrl: "magnet:?xt=urn:btih:AAA222", detailUrl: "https://bangumi.moe/torrent/101" })
    ])
    await subscriptionDb.notificationRounds.put({
      id: "subscription-round:20260414093000000",
      createdAt: now,
      hits: [
        createHit({ id: "hit-1", sourceId: "bangumimoe", detailUrl: "https://bangumi.moe/torrent/100" }),
        createHit({ id: "hit-2", sourceId: "bangumimoe", magnetUrl: "magnet:?xt=urn:btih:AAA222", detailUrl: "https://bangumi.moe/torrent/101" })
      ]
    })

    const downloader = createDownloader()
    downloader.addUrls = vi.fn(async () => ({
      entries: [{ url: "magnet:?xt=urn:btih:AAA111", status: "submitted" as const }]
    }))

    const result = await downloadSubscriptionHitsBySelection(
      {
        hitIds: ["hit-1"],
        roundId: "subscription-round:20260414093000000"
      },
      {
        getSubscriptionPolicy: async () => createSubscriptionPolicy(),
        getSourceConfig: async () => createSourceConfig(),
        getDownloaderConfig: async () => createDownloaderConfig(),
        getDownloader: () => downloader,
        ensureDownloaderPermission,
        fetchTorrentForUpload: vi.fn(async (): Promise<DownloaderTorrentFile> => ({
          filename: "test.torrent",
          blob: new Blob(["torrent"])
        })),
        extractSingleItem: vi.fn(),
        now: () => now
      }
    )

    expect(result.attemptedHits).toBe(1)
    await expect(
      subscriptionDb.notificationRounds.get("subscription-round:20260414093000000")
    ).resolves.toEqual(
      expect.objectContaining({
        hits: [expect.objectContaining({ id: "hit-2" })]
      })
    )
  })

  it("does not resubmit hits already marked as submitted or duplicate", async () => {
    const now = "2026-04-14T09:30:00.000Z"
    const ensureDownloaderPermission = vi.fn(async () => undefined)

    await subscriptionDb.subscriptions.put(createSubscription({
      sourceIds: ["bangumimoe"]
    }))
    await subscriptionDb.subscriptionHits.bulkPut([
      createHit({ id: "hit-1", sourceId: "bangumimoe", downloadStatus: "submitted", downloadedAt: "2026-04-13T09:30:00.000Z", detailUrl: "https://bangumi.moe/torrent/100" }),
      createHit({ id: "hit-2", sourceId: "bangumimoe", downloadStatus: "duplicate", downloadedAt: "2026-04-13T09:30:00.000Z", detailUrl: "https://bangumi.moe/torrent/101" }),
      createHit({ id: "hit-3", sourceId: "bangumimoe", downloadStatus: "idle", magnetUrl: "magnet:?xt=urn:btih:AAA333", detailUrl: "https://bangumi.moe/torrent/102" })
    ])

    const downloader = createDownloader()
    downloader.addUrls = vi.fn(async () => ({
      entries: [{ url: "magnet:?xt=urn:btih:AAA333", status: "submitted" as const }]
    }))

    const result = await downloadSubscriptionHitsBySelection(
      { hitIds: ["hit-1", "hit-2", "hit-3"] },
      {
        getSubscriptionPolicy: async () => createSubscriptionPolicy(),
        getSourceConfig: async () => createSourceConfig(),
        getDownloaderConfig: async () => createDownloaderConfig(),
        getDownloader: () => downloader,
        ensureDownloaderPermission,
        fetchTorrentForUpload: vi.fn(),
        extractSingleItem: vi.fn(),
        now: () => now
      }
    )

    expect(result.attemptedHits).toBe(1)
    expect(result.submittedHits).toBe(1)
    expect(ensureDownloaderPermission).toHaveBeenCalledWith(createDownloaderConfig())
  })
})
