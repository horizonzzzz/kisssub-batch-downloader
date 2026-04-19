import { beforeEach, describe, expect, it, vi } from "vitest"

const { persistBatchHistoryMock, getSourceConfigMock, getBatchExecutionConfigMock, getFilterConfigMock, getDownloaderConfigMock } = vi.hoisted(() => ({
  persistBatchHistoryMock: vi.fn(),
  getSourceConfigMock: vi.fn(),
  getBatchExecutionConfigMock: vi.fn(),
  getFilterConfigMock: vi.fn(),
  getDownloaderConfigMock: vi.fn()
}))

vi.mock("../../../src/lib/background/history-builder", () => ({
  persistBatchHistory: persistBatchHistoryMock
}))

vi.mock("../../../src/lib/sources/config", () => ({
  getSourceConfig: getSourceConfigMock
}))

vi.mock("../../../src/lib/batch-config/storage", () => ({
  getBatchExecutionConfig: getBatchExecutionConfigMock
}))

vi.mock("../../../src/lib/filter-rules/storage", () => ({
  getFilterConfig: getFilterConfigMock
}))

vi.mock("../../../src/lib/downloader/config/storage", () => ({
  getDownloaderConfig: getDownloaderConfigMock
}))

import { createBatchDownloadManager } from "../../../src/lib/background/manager"
import type { DownloaderAdapter } from "../../../src/lib/downloader"
import { DEFAULT_BATCH_EXECUTION_CONFIG } from "../../../src/lib/batch-config/defaults"
import { DEFAULT_FILTER_CONFIG } from "../../../src/lib/filter-rules/defaults"
import { DEFAULT_DOWNLOADER_CONFIG } from "../../../src/lib/downloader/config/defaults"
import { DEFAULT_SOURCE_CONFIG } from "../../../src/lib/sources/config/defaults"
import type {
  BatchEventPayload,
  BatchItem,
  ExtractionResult,
  FilterEntry
} from "../../../src/lib/shared/types"
import type { SourceConfig } from "../../../src/lib/sources/config/types"
import type { DownloaderConfig } from "../../../src/lib/downloader/config/types"
import type { BatchExecutionConfig } from "../../../src/lib/batch-config/types"
import type { FilterConfig } from "../../../src/lib/filter-rules/types"
import type { ExtractionContext } from "../../../src/lib/sources/types"

function createFilterConfig(filters: FilterEntry[] = []): FilterConfig {
  return {
    rules: filters
  }
}

function createSourceConfig(overrides: Partial<SourceConfig> = {}): SourceConfig {
  return {
    ...DEFAULT_SOURCE_CONFIG,
    ...overrides
  }
}

function createDownloaderConfig(overrides: Partial<DownloaderConfig> = {}): DownloaderConfig {
  return {
    activeId: "qbittorrent",
    profiles: {
      qbittorrent: {
        baseUrl: "http://127.0.0.1:17474",
        username: "admin",
        password: "secret"
      },
      transmission: {
        baseUrl: "http://127.0.0.1:9091/transmission/rpc",
        username: "",
        password: ""
      }
    },
    ...overrides
  }
}

function createBatchExecutionConfig(overrides: Partial<BatchExecutionConfig> = {}): BatchExecutionConfig {
  return {
    ...DEFAULT_BATCH_EXECUTION_CONFIG,
    ...overrides
  }
}

function createManager(overrides: Partial<Parameters<typeof createBatchDownloadManager>[0]> = {}) {
  const downloaderConfig = createDownloaderConfig()
  const sourceConfig = createSourceConfig()
  const batchExecutionConfig = createBatchExecutionConfig()
  const filterConfig = createFilterConfig()
  const downloader = {
    id: "qbittorrent",
    displayName: "qBittorrent",
    authenticate: vi.fn().mockResolvedValue(undefined),
    addUrls: vi.fn().mockImplementation(async (_settings, urls: string[]) => ({
      entries: urls.map((url) => ({
        url,
        status: "submitted" as const
      }))
    })),
    addTorrentFiles: vi.fn().mockResolvedValue(undefined),
    testConnection: vi.fn()
  } satisfies DownloaderAdapter

  // Set up default mocks for storage functions
  getSourceConfigMock.mockResolvedValue(sourceConfig)
  getBatchExecutionConfigMock.mockResolvedValue(batchExecutionConfig)
  getFilterConfigMock.mockResolvedValue(filterConfig)
  getDownloaderConfigMock.mockResolvedValue(downloaderConfig)

  const dependencies = {
    saveBatchUiPreferences: vi.fn().mockResolvedValue({ lastSavePath: "" }),
    extractSingleItem: vi.fn(),
    sendBatchEvent: vi.fn().mockResolvedValue(undefined),
    getDownloader: vi.fn(() => downloader),
    fetchImpl: vi.fn().mockResolvedValue(
      new Response("torrent-data", {
        status: 200,
        headers: {
          "content-disposition": 'attachment; filename="episode-01.torrent"'
        }
      })
    ),
    ensureDownloaderPermission: vi.fn().mockResolvedValue(undefined)
  }
  Object.assign(dependencies, overrides)

  return {
    downloaderConfig,
    sourceConfig,
    batchExecutionConfig,
    filterConfig,
    downloader,
    dependencies,
    manager: createBatchDownloadManager(
      dependencies as Parameters<typeof createBatchDownloadManager>[0]
    )
  }
}

describe("createBatchDownloadManager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    persistBatchHistoryMock.mockReset()
    getSourceConfigMock.mockReset()
    getBatchExecutionConfigMock.mockReset()
    getFilterConfigMock.mockReset()
    getDownloaderConfigMock.mockReset()

    // Set up default mocks
    getSourceConfigMock.mockResolvedValue(createSourceConfig())
    getBatchExecutionConfigMock.mockResolvedValue(createBatchExecutionConfig())
    getFilterConfigMock.mockResolvedValue(createFilterConfig())
    getDownloaderConfigMock.mockResolvedValue(createDownloaderConfig())
  })

  it("rejects downloads that do not come from a source tab", async () => {
    const { manager } = createManager()

    await expect(manager.startBatchDownload(null, [], "")).rejects.toThrow(
      "Batch downloads can only be started from a supported source tab."
    )
  })

  it("reuses pre-resolved torrent files without opening detail pages again", async () => {
    const { manager, dependencies, downloader } = createManager({
      saveBatchUiPreferences: vi.fn().mockResolvedValue({ lastSavePath: "D:\\Anime" })
    })

    await expect(
      manager.startBatchDownload(
        11,
        [
          {
            sourceId: "acgrip",
            detailUrl: "https://acg.rip/t/350361",
            title: "Hell Mode - 11",
            torrentUrl: "https://acg.rip/t/350361.torrent"
          }
        ],
        " D:\\Anime "
      )
    ).resolves.toEqual({
      ok: true,
      total: 1
    })

    await vi.waitFor(() => {
      expect(downloader.addTorrentFiles).toHaveBeenCalledTimes(1)
    })

    expect(dependencies.extractSingleItem).not.toHaveBeenCalled()
    expect(downloader.authenticate).toHaveBeenCalledTimes(1)
    expect(downloader.addTorrentFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        activeId: "qbittorrent",
        profiles: expect.objectContaining({
          qbittorrent: expect.objectContaining({
            baseUrl: "http://127.0.0.1:17474"
          })
        })
      }),
      [expect.objectContaining({ filename: "episode-01.torrent" })],
      {
        savePath: "D:\\Anime"
      }
    )
    expect(
      dependencies.sendBatchEvent.mock.calls.map((call) => (call[1] as BatchEventPayload).stage)
    ).toEqual(["started", "progress", "submitting", "completed"])
    expect(dependencies.sendBatchEvent.mock.calls.at(-1)?.[1].summary).toEqual({
      submitted: 1,
      duplicated: 0,
      failed: 0
    })
  })

  it("deduplicates extracted results before qB submission", async () => {
    const { manager, dependencies, downloader } = createManager()
    dependencies.extractSingleItem.mockResolvedValueOnce({
      ok: true,
      title: "Episode 01",
      detailUrl: "https://www.kisssub.org/show-deadbeef.html",
      hash: "deadbeef",
      magnetUrl: "magnet:?xt=urn:btih:deadbeef",
      torrentUrl: "",
      failureReason: ""
    })
    dependencies.extractSingleItem.mockResolvedValueOnce({
      ok: true,
      title: "Episode 02",
      detailUrl: "https://www.kisssub.org/show-feedface.html",
      hash: "deadbeef",
      magnetUrl: "magnet:?xt=urn:btih:deadbeef",
      torrentUrl: "",
      failureReason: ""
    })

    await manager.startBatchDownload(
      12,
      [
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          title: "Episode 01"
        },
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-feedface.html",
          title: "Episode 02"
        }
      ],
      ""
    )

    await vi.waitFor(() => {
      expect(downloader.addUrls).toHaveBeenCalledTimes(1)
    })

    expect(downloader.addUrls).toHaveBeenCalledWith(
      expect.any(Object),
      ["magnet:?xt=urn:btih:deadbeef"],
      undefined
    )
    expect(dependencies.sendBatchEvent.mock.calls.at(-1)?.[1].summary).toEqual({
      submitted: 1,
      duplicated: 1,
      failed: 0
    })
  })

  it("records partial URL submission success when the downloader reports mixed URL results", async () => {
    const { manager, dependencies, downloader } = createManager()
    downloader.addUrls = vi.fn().mockResolvedValue({
      entries: [
        {
          url: "magnet:?xt=urn:btih:aaa",
          status: "submitted"
        },
        {
          url: "magnet:?xt=urn:btih:bbb",
          status: "submitted"
        },
        {
          url: "magnet:?xt=urn:btih:ccc",
          status: "failed",
          error: "Transmission RPC failed on item 3."
        }
      ]
    })

    await expect(
      manager.startBatchDownload(
        21,
        [
          {
            sourceId: "kisssub",
            detailUrl: "https://www.kisssub.org/show-aaa.html",
            title: "Episode 01",
            magnetUrl: "magnet:?xt=urn:btih:aaa"
          },
          {
            sourceId: "kisssub",
            detailUrl: "https://www.kisssub.org/show-bbb.html",
            title: "Episode 02",
            magnetUrl: "magnet:?xt=urn:btih:bbb"
          },
          {
            sourceId: "kisssub",
            detailUrl: "https://www.kisssub.org/show-ccc.html",
            title: "Episode 03",
            magnetUrl: "magnet:?xt=urn:btih:ccc"
          }
        ],
        ""
      )
    ).resolves.toEqual({
      ok: true,
      total: 3
    })

    await vi.waitFor(() => {
      expect(dependencies.sendBatchEvent.mock.calls.at(-1)?.[1].summary).toEqual({
        submitted: 2,
        duplicated: 0,
        failed: 1
      })
    })

    expect(downloader.addUrls).toHaveBeenCalledWith(
      expect.any(Object),
      [
        "magnet:?xt=urn:btih:aaa",
        "magnet:?xt=urn:btih:bbb",
        "magnet:?xt=urn:btih:ccc"
      ],
      undefined
    )
    expect(dependencies.sendBatchEvent.mock.calls.at(-1)?.[1].results).toEqual([
      {
        title: "Episode 01",
        detailUrl: "https://www.kisssub.org/show-aaa.html",
        status: "submitted",
        message: "Magnet queued in the downloader."
      },
      {
        title: "Episode 02",
        detailUrl: "https://www.kisssub.org/show-bbb.html",
        status: "submitted",
        message: "Magnet queued in the downloader."
      },
      {
        title: "Episode 03",
        detailUrl: "https://www.kisssub.org/show-ccc.html",
        status: "failed",
        message: "Downloader submission failed: Transmission RPC failed on item 3."
      }
    ])
  })

  it("blocks items that do not match any enabled filter before submitting them to qBittorrent", async () => {
    const { manager, dependencies, downloader } = createManager({
      extractSingleItem: vi.fn().mockResolvedValue({
        ok: true,
        title: "[喵萌奶茶屋] Episode 01 [1080p][RAW]",
        detailUrl: "https://www.kisssub.org/show-deadbeef.html",
        hash: "deadbeef",
        magnetUrl: "magnet:?xt=urn:btih:deadbeef",
        torrentUrl: "",
        failureReason: ""
      })
    })

    // Override the filter config mock after createManager sets it up
    getFilterConfigMock.mockResolvedValue(createFilterConfig([
      {
        id: "filter-subgroup",
        name: "爱恋 1080 简繁",
        enabled: true,
        sourceIds: ["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"],
        must: [
          {
            id: "condition-subgroup",
            field: "subgroup",
            operator: "contains",
            value: "爱恋字幕社"
          }
        ],
        any: []
      }
    ]))

    await expect(
      manager.startBatchDownload(
        16,
        [
          {
            sourceId: "kisssub",
            detailUrl: "https://www.kisssub.org/show-deadbeef.html",
            title: "[喵萌奶茶屋] Episode 01 [1080p][RAW]"
          }
        ],
        ""
      )
    ).resolves.toEqual({
      ok: true,
      total: 1
    })

    await vi.waitFor(() => {
      expect(dependencies.sendBatchEvent.mock.calls.at(-1)?.[1]).toMatchObject({
        stage: "completed",
        summary: {
          submitted: 0,
          duplicated: 0,
          failed: 1
        }
      })
    })

    expect(dependencies.extractSingleItem).toHaveBeenCalledTimes(1)
    expect(downloader.authenticate).not.toHaveBeenCalled()
    expect(downloader.addUrls).not.toHaveBeenCalled()
    expect(downloader.addTorrentFiles).not.toHaveBeenCalled()
    expect(dependencies.sendBatchEvent.mock.calls.at(-1)?.[1].results).toEqual([
      {
        title: "[喵萌奶茶屋] Episode 01 [1080p][RAW]",
        detailUrl: "https://www.kisssub.org/show-deadbeef.html",
        status: "failed",
        message: "Blocked by filters: no filter matched"
      }
    ])
    expect(persistBatchHistoryMock).toHaveBeenCalledTimes(1)
    expect(persistBatchHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        stats: expect.objectContaining({
          total: 1,
          submitted: 0,
          failed: 1
        }),
        results: expect.arrayContaining([
          expect.objectContaining({
            status: "failed",
            message: "Blocked by filters: no filter matched"
          })
        ])
      }),
      "kisssub"
    )
  })

  it("blocks unmatched extracted items when enabled filters exist", async () => {
    const { manager, dependencies, downloader } = createManager({
      extractSingleItem: vi.fn().mockResolvedValue({
        ok: true,
        title: "[LoliHouse] Episode 01 [1080p]",
        detailUrl: "https://www.kisssub.org/show-deadbeef.html",
        hash: "deadbeef",
        magnetUrl: "magnet:?xt=urn:btih:deadbeef",
        torrentUrl: "",
        failureReason: ""
      })
    })

    // Override the filter config mock after createManager sets it up
    getFilterConfigMock.mockResolvedValue(createFilterConfig([
      {
        id: "filter-include",
        name: "仅保留喵萌",
        enabled: true,
        sourceIds: ["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"],
        must: [
          {
            id: "condition-subgroup",
            field: "subgroup",
            operator: "contains",
            value: "喵萌奶茶屋"
          }
        ],
        any: []
      }
    ]))

    await expect(
      manager.startBatchDownload(
        18,
        [
          {
            sourceId: "kisssub",
            detailUrl: "https://www.kisssub.org/show-deadbeef.html",
            title: "[LoliHouse] Episode 01 [1080p]"
          }
        ],
        ""
      )
    ).resolves.toEqual({
      ok: true,
      total: 1
    })

    await vi.waitFor(() => {
      expect(dependencies.sendBatchEvent.mock.calls.at(-1)?.[1]).toMatchObject({
        stage: "completed",
        summary: {
          submitted: 0,
          duplicated: 0,
          failed: 1
        }
      })
    })

    expect(downloader.authenticate).not.toHaveBeenCalled()
    expect(downloader.addUrls).not.toHaveBeenCalled()
    expect(downloader.addTorrentFiles).not.toHaveBeenCalled()
    expect(dependencies.sendBatchEvent.mock.calls.at(-1)?.[1].results).toEqual([
      {
        title: "[LoliHouse] Episode 01 [1080p]",
        detailUrl: "https://www.kisssub.org/show-deadbeef.html",
        status: "failed",
        message: "Blocked by filters: no filter matched"
      }
    ])
  })

  it("blocks unmatched pre-resolved direct-link items before qB submission", async () => {
    const { manager, dependencies, downloader } = createManager()

    // Override the filter config mock after createManager sets it up
    getFilterConfigMock.mockResolvedValue(createFilterConfig([
      {
        id: "filter-include",
        name: "仅保留喵萌",
        enabled: true,
        sourceIds: ["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"],
        must: [
          {
            id: "condition-subgroup",
            field: "subgroup",
            operator: "contains",
            value: "喵萌奶茶屋"
          }
        ],
        any: []
      }
    ]))

    await expect(
      manager.startBatchDownload(
        19,
        [
          {
            sourceId: "kisssub",
            detailUrl: "https://www.kisssub.org/show-deadbeef.html",
            title: "[LoliHouse] Episode 01 [1080p]",
            magnetUrl: "magnet:?xt=urn:btih:deadbeef"
          }
        ],
        ""
      )
    ).resolves.toEqual({
      ok: true,
      total: 1
    })

    await vi.waitFor(() => {
      expect(dependencies.sendBatchEvent.mock.calls.at(-1)?.[1]).toMatchObject({
        stage: "completed",
        summary: {
          submitted: 0,
          duplicated: 0,
          failed: 1
        }
      })
    })

    expect(dependencies.extractSingleItem).not.toHaveBeenCalled()
    expect(downloader.authenticate).not.toHaveBeenCalled()
    expect(downloader.addUrls).not.toHaveBeenCalled()
    expect(dependencies.sendBatchEvent.mock.calls.at(-1)?.[1].results).toEqual([
      {
        title: "[LoliHouse] Episode 01 [1080p]",
        detailUrl: "https://www.kisssub.org/show-deadbeef.html",
        status: "failed",
        message: "Blocked by filters: no filter matched"
      }
    ])
  })

  it("keeps using the original list title for filtering even when extraction reveals a matching subgroup", async () => {
    const { manager, dependencies, downloader } = createManager({
      extractSingleItem: vi.fn().mockResolvedValue({
        ok: true,
        title: "[喵萌奶茶屋] Episode 01 [1080p]",
        detailUrl: "https://www.kisssub.org/show-deadbeef.html",
        hash: "deadbeef",
        magnetUrl: "magnet:?xt=urn:btih:deadbeef",
        torrentUrl: "",
        failureReason: ""
      })
    })

    // Override the filter config mock after createManager sets it up
    getFilterConfigMock.mockResolvedValue(createFilterConfig([
      {
        id: "filter-subgroup",
        name: "仅保留喵萌",
        enabled: true,
        sourceIds: ["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"],
        must: [
          {
            id: "condition-subgroup",
            field: "subgroup",
            operator: "contains",
            value: "喵萌奶茶屋"
          }
        ],
        any: []
      }
    ]))

    await expect(
      manager.startBatchDownload(
        17,
        [
          {
            sourceId: "kisssub",
            detailUrl: "https://www.kisssub.org/show-deadbeef.html",
            title: "Episode 01"
          }
        ],
        ""
      )
    ).resolves.toEqual({
      ok: true,
      total: 1
    })

    await vi.waitFor(() => {
      expect(dependencies.sendBatchEvent.mock.calls.at(-1)?.[1]).toMatchObject({
        stage: "completed",
        summary: {
          submitted: 0,
          duplicated: 0,
          failed: 1
        }
      })
    })

    expect(dependencies.extractSingleItem).toHaveBeenCalledTimes(1)
    expect(downloader.authenticate).not.toHaveBeenCalled()
    expect(downloader.addUrls).not.toHaveBeenCalled()
    expect(dependencies.sendBatchEvent.mock.calls.at(-1)?.[1].results).toEqual([
      {
        title: "Episode 01",
        detailUrl: "https://www.kisssub.org/show-deadbeef.html",
        status: "failed",
        message: "Blocked by filters: no filter matched"
      }
    ])
  })

  it("ignores enabled rules that only target other sites when deciding whether to submit", async () => {
    const { manager, dependencies, downloader } = createManager()

    // Override the filter config mock after createManager sets it up
    getFilterConfigMock.mockResolvedValue(createFilterConfig([
      {
        id: "bangumi-only",
        name: "Bangumi 专用",
        enabled: true,
        sourceIds: ["bangumimoe"],
        must: [
          {
            id: "condition-title",
            field: "title",
            operator: "contains",
            value: "1080p"
          }
        ],
        any: []
      }
    ]))

    await expect(
      manager.startBatchDownload(
        20,
        [
          {
            sourceId: "kisssub",
            detailUrl: "https://www.kisssub.org/show-cafebabe.html",
            title: "[LoliHouse] Episode 01 [1080p]",
            magnetUrl: "magnet:?xt=urn:btih:cafebabe"
          }
        ],
        ""
      )
    ).resolves.toEqual({
      ok: true,
      total: 1
    })

    await vi.waitFor(() => {
      expect(downloader.addUrls).toHaveBeenCalledTimes(1)
    })

    expect(dependencies.extractSingleItem).not.toHaveBeenCalled()
    expect(downloader.authenticate).toHaveBeenCalledTimes(1)
    expect(downloader.addUrls).toHaveBeenCalledWith(
      expect.any(Object),
      ["magnet:?xt=urn:btih:cafebabe"],
      undefined
    )
    await vi.waitFor(() => {
      expect(dependencies.sendBatchEvent.mock.calls.at(-1)?.[1].summary).toEqual({
        submitted: 1,
        duplicated: 0,
        failed: 0
      })
    })
  })

  it("prevents concurrent jobs from starting in the same tab", async () => {
    let resolveExtraction: ((value: ExtractionResult) => void) | undefined
    const { manager } = createManager({
      extractSingleItem: vi.fn().mockImplementation(
        () =>
          new Promise<ExtractionResult>((resolve) => {
            resolveExtraction = resolve
          })
      )
    })

    await expect(
      manager.startBatchDownload(
        13,
        [
          {
            sourceId: "kisssub",
            detailUrl: "https://www.kisssub.org/show-deadbeef.html",
            title: "Episode 01"
          }
        ],
        ""
      )
    ).resolves.toMatchObject({ ok: true })

    await expect(
      manager.startBatchDownload(
        13,
        [
          {
            sourceId: "kisssub",
            detailUrl: "https://www.kisssub.org/show-feedface.html",
            title: "Episode 02"
          }
        ],
        ""
      )
    ).rejects.toThrow("A batch download is already running in this tab.")

    resolveExtraction?.({
      ok: false,
      title: "Episode 01",
      detailUrl: "https://www.kisssub.org/show-deadbeef.html",
      hash: "deadbeef",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "No download link could be extracted from the detail page."
    })
    await vi.waitFor(() => {
      expect(manager.activeJobs.size).toBe(0)
    })
  })

  it("ensures downloader host permission before authenticating and submitting", async () => {
    const { manager, dependencies, downloader } = createManager()

    await expect(
      manager.startBatchDownload(
        22,
        [
          {
            sourceId: "kisssub",
            detailUrl: "https://www.kisssub.org/show-cafebabe.html",
            title: "Episode 01",
            magnetUrl: "magnet:?xt=urn:btih:cafebabe"
          }
        ],
        ""
      )
    ).resolves.toEqual({
      ok: true,
      total: 1
    })

    await vi.waitFor(() => {
      expect(downloader.addUrls).toHaveBeenCalledTimes(1)
    })

    expect((dependencies as any).ensureDownloaderPermission).toHaveBeenCalledWith(
      expect.objectContaining({
        activeId: "qbittorrent",
        profiles: expect.objectContaining({
          qbittorrent: expect.objectContaining({
            baseUrl: "http://127.0.0.1:17474"
          })
        })
      })
    )
  })

  it("rejects batch downloads from disabled sources before starting a job", async () => {
    const { manager, dependencies } = createManager()

    // Override the source config mock after createManager sets it up
    getSourceConfigMock.mockResolvedValue(
      createSourceConfig({
        acgrip: {
          ...DEFAULT_SOURCE_CONFIG.acgrip,
          enabled: false
        }
      })
    )

    await expect(
      manager.startBatchDownload(
        15,
        [
          {
            sourceId: "acgrip",
            detailUrl: "https://acg.rip/t/350361",
            title: "Hell Mode - 11"
          }
        ],
        ""
      )
    ).rejects.toThrow("Batch downloads are disabled for source: acgrip")

    expect(dependencies.sendBatchEvent).not.toHaveBeenCalled()
    expect(manager.activeJobs.size).toBe(0)
  })

  it("reports fatal errors from the extraction pipeline", async () => {
    const { manager, dependencies } = createManager({
      extractSingleItem: vi.fn().mockRejectedValue(new Error("kaboom"))
    })

    await manager.startBatchDownload(
      14,
      [
        {
          sourceId: "kisssub",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          title: "Episode 01"
        }
      ] satisfies BatchItem[],
      ""
    )

    await vi.waitFor(() => {
      expect(dependencies.sendBatchEvent.mock.calls.at(-1)?.[1]).toMatchObject({
        stage: "fatal",
        error: "kaboom"
      })
    })
  })
})
