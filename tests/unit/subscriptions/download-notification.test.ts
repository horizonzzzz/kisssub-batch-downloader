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
import { downloadSubscriptionNotificationHits, downloadPreparedSubscriptionHits } from "../../../src/lib/subscriptions/download-notification"
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
    deletedAt: null,
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
    readAt: null,
    resolvedAt: null,
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

  it("downloads historical hits even when the subscription is disabled", async () => {
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
      addUrls: vi.fn(async () => ({
        entries: [{ url: "magnet:?xt=urn:btih:AAA111", status: "submitted" as const }]
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

    expect(result.totalHits).toBe(1)
    expect(result.attemptedHits).toBe(1)
    expect(result.submittedCount).toBe(1)
    expect(downloader.authenticate).toHaveBeenCalledTimes(1)
  })

  it("downloads historical hits even when the subscription is tombstoned and the source is disabled", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(
      createSubscription({
        id: "sub-tombstoned",
        enabled: false,
        deletedAt: "2026-04-15T09:30:00.000Z"
      })
    )
    await subscriptionDb.notificationRounds.put({
      id: "subscription-round:20260414093000000",
      createdAt: now,
      hits: [
        createHit({
          id: "hit-tombstoned",
          subscriptionId: "sub-tombstoned"
        })
      ]
    })

    const downloader: DownloaderAdapter = {
      id: "qbittorrent",
      displayName: "qBittorrent",
      authenticate: vi.fn(async () => undefined),
      addUrls: vi.fn(async () => ({
        entries: [{ url: "magnet:?xt=urn:btih:AAA111", status: "submitted" as const }]
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
        sourceConfig: createSourceConfig({
          bangumimoe: {
            ...DEFAULT_SOURCE_CONFIG.bangumimoe,
            enabled: false
          }
        }),
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

    expect(result.totalHits).toBe(1)
    expect(result.attemptedHits).toBe(1)
    expect(result.submittedCount).toBe(1)
    expect(downloader.authenticate).toHaveBeenCalledTimes(1)
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

  it("extracts a hidden detail page when a notification hit has no stored direct links", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(createSubscription({
      sourceIds: ["bangumimoe"]
    }))
    await subscriptionDb.notificationRounds.put({
      id: "subscription-round:20260414093000000",
      createdAt: now,
      hits: [createHit({
        magnetUrl: "",
        torrentUrl: "",
        detailUrl: "https://bangumi.moe/torrent/100"
      })]
    })

    const extractSingleItem = vi.fn(async () => ({
      ok: true,
      title: "[LoliHouse] Medalist - 01 [1080p]",
      detailUrl: "https://bangumi.moe/torrent/100",
      hash: "100",
      magnetUrl: "magnet:?xt=urn:btih:AAA111",
      torrentUrl: "",
      failureReason: ""
    }))

    const downloader: DownloaderAdapter = {
      id: "qbittorrent",
      displayName: "qBittorrent",
      authenticate: vi.fn(async () => undefined),
      addUrls: vi.fn(async () => ({
        entries: [{ url: "magnet:?xt=urn:btih:AAA111", status: "submitted" as const }]
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
        fetchTorrentForUpload: vi.fn(),
        extractSingleItem,
        getDownloaderConfig: async () => createDownloaderConfig(),
        now: () => now
      }
    )

    expect(result.submittedCount).toBe(1)
    expect(extractSingleItem).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: "bangumimoe",
        detailUrl: "https://bangumi.moe/torrent/100"
      }),
      expect.any(Object)
    )
  })

  it("marks the hit as failed when hidden detail extraction still returns no usable download link", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(createSubscription({
      sourceIds: ["bangumimoe"]
    }))
    await subscriptionDb.subscriptionRuntime.put({
      subscriptionId: "sub-1",
      lastScanAt: now,
      lastMatchedAt: now,
      lastError: "",
      seenFingerprints: ["fp-1"],
      recentHits: [createHit({
        magnetUrl: "",
        torrentUrl: "",
        detailUrl: "https://bangumi.moe/torrent/100"
      })]
    })
    await subscriptionDb.notificationRounds.put({
      id: "subscription-round:20260414093000000",
      createdAt: now,
      hits: [createHit({
        magnetUrl: "",
        torrentUrl: "",
        detailUrl: "https://bangumi.moe/torrent/100"
      })]
    })

    const extractSingleItem = vi.fn(async () => ({
      ok: false,
      title: "[LoliHouse] Medalist - 01 [1080p]",
      detailUrl: "https://bangumi.moe/torrent/100",
      hash: "100",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "The detail page finished loading, but no usable magnet or torrent URL was exposed."
    }))

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
        fetchTorrentForUpload: vi.fn(),
        extractSingleItem,
        getDownloaderConfig: async () => createDownloaderConfig(),
        now: () => now
      }
    )

    expect(result.failedCount).toBe(1)
    expect(await subscriptionDb.notificationRounds.get("subscription-round:20260414093000000")).toEqual(
      expect.objectContaining({
        hits: [
          expect.objectContaining({
            id: "hit-1",
            downloadStatus: "idle",
            downloadedAt: null
          })
        ]
      })
    )
  })

  it("marks the hit as failed when hidden detail extraction throws an exception", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(createSubscription({
      sourceIds: ["bangumimoe"]
    }))
    await subscriptionDb.notificationRounds.put({
      id: "subscription-round:20260414093000000",
      createdAt: now,
      hits: [createHit({
        magnetUrl: "",
        torrentUrl: "",
        detailUrl: "https://bangumi.moe/torrent/100"
      })]
    })

    const extractSingleItem = vi.fn(async () => {
      throw new Error("Timed out waiting for the detail tab to finish loading.")
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
        fetchTorrentForUpload: vi.fn(),
        extractSingleItem,
        getDownloaderConfig: async () => createDownloaderConfig(),
        now: () => now
      }
    )

    expect(result.failedCount).toBe(1)
    expect(result.submittedCount).toBe(0)
    expect(await subscriptionDb.notificationRounds.get("subscription-round:20260414093000000")).toEqual(
      expect.objectContaining({
        hits: [
          expect.objectContaining({
            id: "hit-1",
            downloadStatus: "idle",
            downloadedAt: null
          })
        ]
      })
    )
  })
})

describe("downloadPreparedSubscriptionHits", () => {
  beforeEach(async () => {
    await resetSubscriptionDb()
  })

  afterEach(async () => {
    await resetSubscriptionDb()
  })

  it("only processes hits passed in the input array", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(createSubscription())
    await subscriptionDb.subscriptionHits.bulkPut([
      createHit({ id: "hit-1" }),
      createHit({ id: "hit-2", magnetUrl: "magnet:?xt=urn:btih:AAA222" }),
      createHit({ id: "hit-3", magnetUrl: "magnet:?xt=urn:btih:AAA333" })
    ])

    const downloader: DownloaderAdapter = {
      id: "qbittorrent",
      displayName: "qBittorrent",
      authenticate: vi.fn(async () => undefined),
      addUrls: vi.fn(async () => ({
        entries: [{ url: "magnet:?xt=urn:btih:AAA111", status: "submitted" as const }]
      })),
      addTorrentFiles: vi.fn(async () => undefined),
      testConnection: vi.fn(async () => ({
        baseUrl: "http://localhost:8080",
        version: "5.0.0"
      }))
    }

    const result = await downloadPreparedSubscriptionHits(
      {
        hits: [createHit({ id: "hit-1" })],
        subscriptionPolicy: createSubscriptionPolicy(),
        sourceConfig: createSourceConfig()
      },
      {
        downloader,
        fetchTorrentForUpload: vi.fn(),
        extractSingleItem: vi.fn(),
        getDownloaderConfig: async () => createDownloaderConfig(),
        now: () => now
      }
    )

    expect(result.attemptedHits).toBe(1)
    expect(result.submittedCount).toBe(1)
    expect(downloader.addUrls).toHaveBeenCalledTimes(1)
    expect(downloader.addUrls).toHaveBeenCalledWith(
      expect.any(Object),
      ["magnet:?xt=urn:btih:AAA111"],
      undefined
    )
  })

  it("downloads selected historical hits even when the subscription is disabled, tombstoned, and the source is disabled", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(createSubscription({
      id: "sub-archived",
      enabled: false,
      deletedAt: "2026-04-15T00:00:00.000Z"
    }))
    await subscriptionDb.subscriptionHits.put(
      createHit({
        id: "hit-archived",
        subscriptionId: "sub-archived"
      })
    )

    const downloader: DownloaderAdapter = {
      id: "qbittorrent",
      displayName: "qBittorrent",
      authenticate: vi.fn(async () => undefined),
      addUrls: vi.fn(async () => ({
        entries: [{ url: "magnet:?xt=urn:btih:AAA111", status: "submitted" as const }]
      })),
      addTorrentFiles: vi.fn(async () => undefined),
      testConnection: vi.fn(async () => ({
        baseUrl: "http://localhost:8080",
        version: "5.0.0"
      }))
    }

    const result = await downloadPreparedSubscriptionHits(
      {
        hits: [
          createHit({
            id: "hit-archived",
            subscriptionId: "sub-archived"
          })
        ],
        subscriptionPolicy: createSubscriptionPolicy(),
        sourceConfig: createSourceConfig({
          bangumimoe: {
            ...DEFAULT_SOURCE_CONFIG.bangumimoe,
            enabled: false
          }
        })
      },
      {
        downloader,
        fetchTorrentForUpload: vi.fn(),
        extractSingleItem: vi.fn(),
        getDownloaderConfig: async () => createDownloaderConfig(),
        now: () => now
      }
    )

    expect(result.attemptedHits).toBe(1)
    expect(result.submittedCount).toBe(1)
    expect(downloader.authenticate).toHaveBeenCalledTimes(1)
  })

  it("skips hits with status submitted or duplicate", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(createSubscription())
    await subscriptionDb.subscriptionHits.bulkPut([
      createHit({ id: "hit-1", downloadStatus: "submitted", downloadedAt: "2026-04-13T09:30:00.000Z" }),
      createHit({ id: "hit-2", downloadStatus: "duplicate", downloadedAt: "2026-04-13T09:30:00.000Z" }),
      createHit({ id: "hit-3", downloadStatus: "idle" })
    ])

    const downloader: DownloaderAdapter = {
      id: "qbittorrent",
      displayName: "qBittorrent",
      authenticate: vi.fn(async () => undefined),
      addUrls: vi.fn(async () => ({
        entries: [{ url: "magnet:?xt=urn:btih:AAA333", status: "submitted" as const }]
      })),
      addTorrentFiles: vi.fn(async () => undefined),
      testConnection: vi.fn(async () => ({
        baseUrl: "http://localhost:8080",
        version: "5.0.0"
      }))
    }

    const result = await downloadPreparedSubscriptionHits(
      {
        hits: [
          createHit({ id: "hit-1", downloadStatus: "submitted" }),
          createHit({ id: "hit-2", downloadStatus: "duplicate" }),
          createHit({ id: "hit-3", downloadStatus: "idle", magnetUrl: "magnet:?xt=urn:btih:AAA333" })
        ],
        subscriptionPolicy: createSubscriptionPolicy(),
        sourceConfig: createSourceConfig()
      },
      {
        downloader,
        fetchTorrentForUpload: vi.fn(),
        extractSingleItem: vi.fn(),
        getDownloaderConfig: async () => createDownloaderConfig(),
        now: () => now
      }
    )

    expect(result.attemptedHits).toBe(1)
    expect(result.submittedCount).toBe(1)
    expect(downloader.authenticate).toHaveBeenCalledTimes(1)
  })

  it("marks successful submissions as submitted with resolvedAt timestamp", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(createSubscription())
    await subscriptionDb.subscriptionHits.put(createHit())

    const downloader: DownloaderAdapter = {
      id: "qbittorrent",
      displayName: "qBittorrent",
      authenticate: vi.fn(async () => undefined),
      addUrls: vi.fn(async () => ({
        entries: [{ url: "magnet:?xt=urn:btih:AAA111", status: "submitted" as const }]
      })),
      addTorrentFiles: vi.fn(async () => undefined),
      testConnection: vi.fn(async () => ({
        baseUrl: "http://localhost:8080",
        version: "5.0.0"
      }))
    }

    const result = await downloadPreparedSubscriptionHits(
      {
        hits: [createHit()],
        subscriptionPolicy: createSubscriptionPolicy(),
        sourceConfig: createSourceConfig()
      },
      {
        downloader,
        fetchTorrentForUpload: vi.fn(),
        extractSingleItem: vi.fn(),
        getDownloaderConfig: async () => createDownloaderConfig(),
        now: () => now
      }
    )

    expect(result.submittedCount).toBe(1)
    expect(result.statuses["hit-1"]).toEqual({
      downloadStatus: "submitted",
      downloadedAt: now
    })
    expect(await subscriptionDb.subscriptionHits.get("hit-1")).toEqual(
      expect.objectContaining({
        id: "hit-1",
        downloadStatus: "submitted",
        downloadedAt: now,
        resolvedAt: now
      })
    )
  })

  it("marks duplicate submissions as duplicate with resolvedAt timestamp", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(createSubscription())
    await subscriptionDb.subscriptionHits.put(createHit())

    const downloader: DownloaderAdapter = {
      id: "qbittorrent",
      displayName: "qBittorrent",
      authenticate: vi.fn(async () => undefined),
      addUrls: vi.fn(async () => ({
        entries: [{ url: "magnet:?xt=urn:btih:AAA111", status: "duplicate" as const }]
      })),
      addTorrentFiles: vi.fn(async () => undefined),
      testConnection: vi.fn(async () => ({
        baseUrl: "http://localhost:8080",
        version: "5.0.0"
      }))
    }

    const result = await downloadPreparedSubscriptionHits(
      {
        hits: [createHit()],
        subscriptionPolicy: createSubscriptionPolicy(),
        sourceConfig: createSourceConfig()
      },
      {
        downloader,
        fetchTorrentForUpload: vi.fn(),
        extractSingleItem: vi.fn(),
        getDownloaderConfig: async () => createDownloaderConfig(),
        now: () => now
      }
    )

    expect(result.duplicateCount).toBe(1)
    expect(result.submittedCount).toBe(0)
    expect(result.statuses["hit-1"]).toEqual({
      downloadStatus: "duplicate",
      downloadedAt: now
    })
    expect(await subscriptionDb.subscriptionHits.get("hit-1")).toEqual(
      expect.objectContaining({
        id: "hit-1",
        downloadStatus: "duplicate",
        downloadedAt: now,
        resolvedAt: now
      })
    )
  })

  it("marks failed extraction as failed without resolvedAt timestamp", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(createSubscription())
    await subscriptionDb.subscriptionHits.put(createHit({
      magnetUrl: "",
      torrentUrl: "",
      detailUrl: "https://bangumi.moe/torrent/100"
    }))

    const extractSingleItem = vi.fn(async () => ({
      ok: false,
      title: "[LoliHouse] Medalist - 01 [1080p]",
      detailUrl: "https://bangumi.moe/torrent/100",
      hash: "",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "No download links found"
    }))

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

    const result = await downloadPreparedSubscriptionHits(
      {
        hits: [createHit({ magnetUrl: "", torrentUrl: "" })],
        subscriptionPolicy: createSubscriptionPolicy(),
        sourceConfig: createSourceConfig()
      },
      {
        downloader,
        fetchTorrentForUpload: vi.fn(),
        extractSingleItem,
        getDownloaderConfig: async () => createDownloaderConfig(),
        now: () => now
      }
    )

    expect(result.failedCount).toBe(1)
    expect(result.statuses["hit-1"]).toEqual({
      downloadStatus: "failed",
      downloadedAt: null
    })
    expect(await subscriptionDb.subscriptionHits.get("hit-1")).toEqual(
      expect.objectContaining({
        id: "hit-1",
        downloadStatus: "failed",
        downloadedAt: null,
        resolvedAt: null
      })
    )
  })

  it("marks failed submission as failed without resolvedAt timestamp", async () => {
    const now = "2026-04-14T09:30:00.000Z"

    await subscriptionDb.subscriptions.put(createSubscription())
    await subscriptionDb.subscriptionHits.put(createHit())

    const downloader: DownloaderAdapter = {
      id: "qbittorrent",
      displayName: "qBittorrent",
      authenticate: vi.fn(async () => undefined),
      addUrls: vi.fn(async () => ({
        entries: [{ url: "magnet:?xt=urn:btih:AAA111", status: "failed" as const }]
      })),
      addTorrentFiles: vi.fn(async () => undefined),
      testConnection: vi.fn(async () => ({
        baseUrl: "http://localhost:8080",
        version: "5.0.0"
      }))
    }

    const result = await downloadPreparedSubscriptionHits(
      {
        hits: [createHit()],
        subscriptionPolicy: createSubscriptionPolicy(),
        sourceConfig: createSourceConfig()
      },
      {
        downloader,
        fetchTorrentForUpload: vi.fn(),
        extractSingleItem: vi.fn(),
        getDownloaderConfig: async () => createDownloaderConfig(),
        now: () => now
      }
    )

    expect(result.failedCount).toBe(1)
    expect(result.statuses["hit-1"]).toEqual({
      downloadStatus: "failed",
      downloadedAt: null
    })
    expect(await subscriptionDb.subscriptionHits.get("hit-1")).toEqual(
      expect.objectContaining({
        id: "hit-1",
        downloadStatus: "failed",
        downloadedAt: null,
        resolvedAt: null
      })
    )
  })
})
