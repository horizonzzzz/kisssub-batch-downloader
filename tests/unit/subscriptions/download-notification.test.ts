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
import { resetSubscriptionDb, subscriptionDb } from "../../../src/lib/subscriptions/db"
import { downloadSubscriptionNotificationHits } from "../../../src/lib/subscriptions/download-notification"
import { listNotificationRounds } from "../../../src/lib/subscriptions/runtime-query"

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
    sourceIds: ["bangumimoe"],
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

describe("downloadSubscriptionNotificationHits", () => {
  beforeEach(async () => {
    await resetSubscriptionDb()
  })

  afterEach(async () => {
    await resetSubscriptionDb()
  })

  it("prunes disabled subscription hits from rounds without touching app settings", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(
      createSubscription({
        id: "sub-disabled",
        enabled: false
      })
    )
    await subscriptionDb.notificationRounds.put({
      id: "subscription-round:20260414093000000",
      createdAt: now,
      hits: [
        createHit({
          id: "hit-disabled",
          subscriptionId: "sub-disabled"
        })
      ]
    })

    const downloader: DownloaderAdapter = {
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

    const result = await downloadSubscriptionNotificationHits(
      {
        subscriptionPolicy: createSubscriptionPolicy(),
        sourceConfig: createSourceConfig(),
        roundId: "subscription-round:20260414093000000"
      },
      {
        downloader,
        fetchTorrentForUpload: vi.fn(
          async (): Promise<DownloaderTorrentFile> => ({
            filename: "unused.torrent",
            blob: new Blob(["torrent"])
          })
        ),
        extractSingleItem: vi.fn(),
        getDownloaderConfig: async () => createDownloaderConfig(),
        now: () => now
      }
    )

    expect(result.totalHits).toBe(0)
    expect(result.attemptedHits).toBe(0)
    await expect(listNotificationRounds()).resolves.toEqual([])
    expect(downloader.authenticate).not.toHaveBeenCalled()
  })

  it("prunes pending rounds when subscription notification downloads are globally disabled", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(createSubscription())
    await subscriptionDb.notificationRounds.put({
      id: "subscription-round:20260414093000000",
      createdAt: now,
      hits: [createHit()]
    })

    const downloader: DownloaderAdapter = {
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

    const result = await downloadSubscriptionNotificationHits(
      {
        subscriptionPolicy: createSubscriptionPolicy({
          notificationsEnabled: false
        }),
        sourceConfig: createSourceConfig(),
        roundId: "subscription-round:20260414093000000"
      },
      {
        downloader,
        fetchTorrentForUpload: vi.fn(
          async (): Promise<DownloaderTorrentFile> => ({
            filename: "unused.torrent",
            blob: new Blob(["torrent"])
          })
        ),
        extractSingleItem: vi.fn(),
        getDownloaderConfig: async () => createDownloaderConfig(),
        now: () => now
      }
    )

    expect(result.totalHits).toBe(0)
    expect(result.attemptedHits).toBe(0)
    await expect(listNotificationRounds()).resolves.toEqual([])
    expect(downloader.authenticate).not.toHaveBeenCalled()
  })

  it("updates hit download status in Dexie after successful submission", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(createSubscription())
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

    const result = await downloadSubscriptionNotificationHits(
      {
        subscriptionPolicy: createSubscriptionPolicy(),
        sourceConfig: createSourceConfig(),
        roundId: "subscription-round:20260414093000000"
      },
      {
        downloader,
        fetchTorrentForUpload: vi.fn(
          async (): Promise<DownloaderTorrentFile> => ({
            filename: "unused.torrent",
            blob: new Blob(["torrent"])
          })
        ),
        extractSingleItem: vi.fn(),
        getDownloaderConfig: async () => createDownloaderConfig(),
        now: () => now
      }
    )

    expect(result.submittedCount).toBe(1)
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
  })
})
