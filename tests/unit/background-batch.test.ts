import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "../../lib/settings"
import type {
  BatchEventPayload,
  BatchItem,
  ClassifiedBatchResult,
  ExtractionResult,
  Settings
} from "../../lib/types"
import {
  createBatchDownloadManager,
  fetchTorrentForUpload,
  getTorrentFilename
} from "../../lib/background-batch"

function createSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    qbBaseUrl: "http://127.0.0.1:17474",
    qbUsername: "admin",
    qbPassword: "secret",
    sourceDeliveryModes: {
      ...DEFAULT_SETTINGS.sourceDeliveryModes
    },
    ...overrides
  }
}

function createManager(overrides: Partial<Parameters<typeof createBatchDownloadManager>[0]> = {}) {
  const settings = createSettings()

  const dependencies = {
    saveSettings: vi.fn().mockResolvedValue(settings),
    extractSingleItem: vi.fn(),
    sendBatchEvent: vi.fn().mockResolvedValue(undefined),
    loginQb: vi.fn().mockResolvedValue(undefined),
    addUrlsToQb: vi.fn().mockResolvedValue(undefined),
    addTorrentFilesToQb: vi.fn().mockResolvedValue(undefined),
    fetchImpl: vi.fn().mockResolvedValue(
      new Response("torrent-data", {
        status: 200,
        headers: {
          "content-disposition": 'attachment; filename="episode-01.torrent"'
        }
      })
    )
  }
  Object.assign(dependencies, overrides)

  return {
    settings,
    dependencies,
    manager: createBatchDownloadManager(
      dependencies as Parameters<typeof createBatchDownloadManager>[0]
    )
  }
}

describe("createBatchDownloadManager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("rejects downloads that do not come from a source tab", async () => {
    const { manager } = createManager()

    await expect(manager.startBatchDownload(null, [], "")).rejects.toThrow(
      "Batch downloads can only be started from a supported source tab."
    )
  })

  it("reuses pre-resolved torrent files without opening detail pages again", async () => {
    const { manager, dependencies } = createManager({
      saveSettings: vi.fn().mockResolvedValue(createSettings({ lastSavePath: "D:\\Anime" }))
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
      expect(dependencies.addTorrentFilesToQb).toHaveBeenCalledTimes(1)
    })

    expect(dependencies.extractSingleItem).not.toHaveBeenCalled()
    expect(dependencies.loginQb).toHaveBeenCalledTimes(1)
    expect(dependencies.addTorrentFilesToQb).toHaveBeenCalledWith(
      expect.objectContaining({ lastSavePath: "D:\\Anime" }),
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
    const { manager, dependencies } = createManager()
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
      expect(dependencies.addUrlsToQb).toHaveBeenCalledTimes(1)
    })

    expect(dependencies.addUrlsToQb).toHaveBeenCalledWith(
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

  it("rejects batch downloads from disabled sources before starting a job", async () => {
    const { manager, dependencies } = createManager({
      saveSettings: vi.fn().mockResolvedValue(
        createSettings({
          enabledSources: {
            ...DEFAULT_SETTINGS.enabledSources,
            acgrip: false
          }
        })
      )
    })

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
      ],
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

describe("background batch helpers", () => {
  it("prefers the filename from content-disposition", () => {
    expect(
      getTorrentFilename(
        "https://acg.rip/t/350361.torrent",
        "attachment; filename*=UTF-8''Episode%2001.torrent"
      )
    ).toBe("Episode 01.torrent")
  })

  it("falls back to the URL pathname when the response header is missing", () => {
    expect(getTorrentFilename("https://acg.rip/files/episode-01.torrent", null)).toBe("episode-01.torrent")
  })

  it("downloads torrent files for upload and keeps the derived filename", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("torrent-data", {
        status: 200,
        headers: {
          "content-disposition": 'attachment; filename="episode-02.torrent"'
        }
      })
    )

    await expect(fetchTorrentForUpload("https://acg.rip/t/350362.torrent", fetchImpl)).resolves.toMatchObject({
      filename: "episode-02.torrent"
    })
  })

  it("throws when the torrent download fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response("", {
        status: 403
      })
    )

    await expect(fetchTorrentForUpload("https://acg.rip/t/350362.torrent", fetchImpl)).rejects.toThrow(
      "Torrent download failed with HTTP 403."
    )
  })
})
