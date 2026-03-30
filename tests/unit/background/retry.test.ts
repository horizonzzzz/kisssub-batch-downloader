import { beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import { retryFailedItems, type RetryDependencies, type RetryRequest } from "../../../lib/background/retry"
import type { Settings } from "../../../lib/shared/types"
import type { TaskHistoryItem, TaskHistoryRecord } from "../../../lib/history/types"
import type { QbTorrentFile } from "../../../lib/downloader/qb"

function createMockRecord(id: string, items: TaskHistoryItem[]): TaskHistoryRecord {
  return {
    id,
    name: "Test Batch",
    sourceId: "kisssub",
    status: "partial_failure",
    createdAt: "2026-01-01T00:00:00Z",
    stats: {
      total: items.length,
      success: items.filter(i => i.status === "success").length,
      duplicated: items.filter(i => i.status === "duplicate").length,
      failed: items.filter(i => i.status === "failed").length
    },
    items,
    version: 1
  }
}

function createFailedItem(id: string, title: string, magnetUrl?: string): TaskHistoryItem {
  return {
    id,
    title,
    detailUrl: `https://example.com/${id}`,
    sourceId: "kisssub",
    magnetUrl,
    status: "failed",
    failure: {
      reason: "qb_error",
      message: "qBittorrent rejected",
      retryable: true,
      retryCount: 0
    },
    deliveryMode: "magnet"
  }
}

function createFailedTorrentFileItem(id: string, title: string, torrentUrl: string): TaskHistoryItem {
  return {
    id,
    title,
    detailUrl: `https://example.com/${id}`,
    sourceId: "acgrip",
    torrentUrl,
    status: "failed",
    failure: {
      reason: "qb_error",
      message: "qBittorrent rejected",
      retryable: true,
      retryCount: 0
    },
    deliveryMode: "torrent-file"
  }
}

function createSuccessItem(id: string, title: string): TaskHistoryItem {
  return {
    id,
    title,
    detailUrl: `https://example.com/${id}`,
    sourceId: "kisssub",
    magnetUrl: `magnet:?xt=urn:btih:${id}`,
    status: "success",
    deliveryMode: "magnet"
  }
}

function createMockDeps(
  overrides?: Partial<RetryDependencies>
): RetryDependencies {
  return {
    getSettings: vi.fn(async () => ({
      qbBaseUrl: "http://localhost:8080",
      qbUsername: "admin",
      qbPassword: "password",
      concurrency: 3,
      injectTimeoutMs: 5000,
      domSettleMs: 1000,
      retryCount: 3,
      remoteScriptUrl: "",
      remoteScriptRevision: "",
      lastSavePath: "",
      sourceDeliveryModes: {},
      enabledSources: { kisssub: true }
    })),
    getHistoryRecord: vi.fn(async () => null),
    updateHistoryRecord: vi.fn(async () => {}),
    loginQb: vi.fn(async () => {}),
    addUrlsToQb: vi.fn(async () => {}),
    fetchTorrentForUpload: vi.fn(async () => ({
      filename: "test.torrent",
      blob: new Blob(["test"], { type: "application/x-bittorrent" })
    })),
    addTorrentFilesToQb: vi.fn(async () => {}),
    ...overrides
  }
}

describe("retryFailedItems", () => {
  let deps: RetryDependencies

  beforeEach(() => {
    vi.clearAllMocks()
    deps = createMockDeps()
  })

  describe("error cases", () => {
    it("throws when record not found", async () => {
      deps.getHistoryRecord = vi.fn(async () => null)

      const request: RetryRequest = { recordId: "nonexistent" }

      await expect(retryFailedItems(request, deps)).rejects.toThrow("历史记录不存在")
    })

    it("throws when qBittorrent login fails", async () => {
      const record = createMockRecord("batch-1", [createFailedItem("item-1", "Test", "magnet:?xt=test")])
      deps.getHistoryRecord = vi.fn(async () => record)
      deps.loginQb = vi.fn(async () => { throw new Error("Connection refused") })

      const request: RetryRequest = { recordId: "batch-1" }

      await expect(retryFailedItems(request, deps)).rejects.toThrow("qBittorrent 登录失败")
      expect(deps.updateHistoryRecord).not.toHaveBeenCalled()
    })
  })

  describe("success cases", () => {
    it("returns zero counts when no failed items", async () => {
      const record = createMockRecord("batch-1", [createSuccessItem("item-1", "Test")])
      deps.getHistoryRecord = vi.fn(async () => record)

      const request: RetryRequest = { recordId: "batch-1" }
      const result = await retryFailedItems(request, deps)

      expect(result.successCount).toBe(0)
      expect(result.failedCount).toBe(0)
      expect(deps.addUrlsToQb).not.toHaveBeenCalled()
    })

    it("successfully retries failed items with magnet URLs", async () => {
      const failedItem = createFailedItem("item-1", "Failed", "magnet:?xt=test")
      const record = createMockRecord("batch-1", [failedItem])
      deps.getHistoryRecord = vi.fn(async () => record)

      const request: RetryRequest = { recordId: "batch-1" }
      const result = await retryFailedItems(request, deps)

      expect(result.successCount).toBe(1)
      expect(result.failedCount).toBe(0)
      expect(deps.addUrlsToQb).toHaveBeenCalledWith(
        expect.anything(),
        ["magnet:?xt=test"],
        undefined
      )
      expect(deps.updateHistoryRecord).toHaveBeenCalled()
      const updatedRecord = (deps.updateHistoryRecord as Mock).mock.calls[0][0]
      expect(updatedRecord.items[0].status).toBe("success")
      expect(updatedRecord.status).toBe("completed")
    })

    it("uses savePath from record when available", async () => {
      const failedItem = createFailedItem("item-1", "Failed", "magnet:?xt=test")
      const record = {
        ...createMockRecord("batch-1", [failedItem]),
        savePath: "/downloads/anime"
      }
      deps.getHistoryRecord = vi.fn(async () => record)

      const request: RetryRequest = { recordId: "batch-1" }
      await retryFailedItems(request, deps)

      expect(deps.addUrlsToQb).toHaveBeenCalledWith(
        expect.anything(),
        ["magnet:?xt=test"],
        { savePath: "/downloads/anime" }
      )
    })
  })

  describe("partial failure cases", () => {
    it("marks items without URLs as failed", async () => {
      const failedItemNoUrl = createFailedItem("item-1", "No URL")
      const record = createMockRecord("batch-1", [failedItemNoUrl])
      deps.getHistoryRecord = vi.fn(async () => record)

      const request: RetryRequest = { recordId: "batch-1" }
      const result = await retryFailedItems(request, deps)

      expect(result.successCount).toBe(0)
      expect(result.failedCount).toBe(1)
      expect(deps.addUrlsToQb).not.toHaveBeenCalled()
      const updatedRecord = (deps.updateHistoryRecord as Mock).mock.calls[0][0]
      expect(updatedRecord.items[0].status).toBe("failed")
      expect(updatedRecord.items[0].failure?.message).toBe("无可用的 magnet 或 torrent 链接")
      expect(updatedRecord.items[0].failure?.retryCount).toBe(1)
    })

    it("marks all items failed when submission fails", async () => {
      const failedItem = createFailedItem("item-1", "Failed", "magnet:?xt=test")
      const record = createMockRecord("batch-1", [failedItem])
      deps.getHistoryRecord = vi.fn(async () => record)
      deps.addUrlsToQb = vi.fn(async () => { throw new Error("HTTP 500") })

      const request: RetryRequest = { recordId: "batch-1" }
      const result = await retryFailedItems(request, deps)

      expect(result.successCount).toBe(0)
      expect(result.failedCount).toBe(1)
      const updatedRecord = (deps.updateHistoryRecord as Mock).mock.calls[0][0]
      expect(updatedRecord.items[0].status).toBe("failed")
      expect(updatedRecord.items[0].failure?.retryCount).toBe(1)
      expect(updatedRecord.items[0].failure?.lastRetryAt).toBeDefined()
    })

    it("handles mixed results - some success, some failure", async () => {
      const failed1 = createFailedItem("item-1", "Failed 1", "magnet:?xt=1")
      const failed2 = createFailedItem("item-2", "Failed 2", "magnet:?xt=2")
      const record = createMockRecord("batch-1", [failed1, failed2])

      let callCount = 0
      deps.getHistoryRecord = vi.fn(async () => record)
      deps.addUrlsToQb = vi.fn(async () => {
        callCount++
        if (callCount === 2) {
          throw new Error("HTTP 500")
        }
      })

      const request: RetryRequest = { recordId: "batch-1" }
      const result = await retryFailedItems(request, deps)

      expect(result.successCount).toBe(1)
      expect(result.failedCount).toBe(1)
      expect(deps.addUrlsToQb).toHaveBeenCalledTimes(2)

      const updatedRecord = (deps.updateHistoryRecord as Mock).mock.calls[0][0]
      expect(updatedRecord.items[0].status).toBe("success")
      expect(updatedRecord.items[1].status).toBe("failed")
      expect(updatedRecord.status).toBe("partial_failure")
    })
  })

  describe("item filtering", () => {
    it("retries only specified itemIds when provided", async () => {
      const failed1 = createFailedItem("item-1", "Failed 1", "magnet:?xt=1")
      const failed2 = createFailedItem("item-2", "Failed 2", "magnet:?xt=2")
      const record = createMockRecord("batch-1", [failed1, failed2])
      deps.getHistoryRecord = vi.fn(async () => record)

      const request: RetryRequest = { recordId: "batch-1", itemIds: ["item-1"] }
      const result = await retryFailedItems(request, deps)

      expect(result.successCount).toBe(1)
      expect(deps.addUrlsToQb).toHaveBeenCalledWith(
        expect.anything(),
        ["magnet:?xt=1"],
        undefined
      )
      const updatedRecord = (deps.updateHistoryRecord as Mock).mock.calls[0][0]
      expect(updatedRecord.items[0].status).toBe("success")
      expect(updatedRecord.items[1].status).toBe("failed")
    })
  })

  describe("stats recalculation", () => {
    it("recalculates stats correctly after retry", async () => {
      const failed = createFailedItem("item-1", "Failed", "magnet:?xt=test")
      const success = createSuccessItem("item-2", "Success")
      const record = createMockRecord("batch-1", [failed, success])
      deps.getHistoryRecord = vi.fn(async () => record)

      const request: RetryRequest = { recordId: "batch-1" }
      const result = await retryFailedItems(request, deps)

      expect(result.updatedRecord.stats.total).toBe(2)
      expect(result.updatedRecord.stats.success).toBe(2)
      expect(result.updatedRecord.stats.failed).toBe(0)
      expect(result.updatedRecord.status).toBe("completed")
    })
  })

  describe("torrent-file delivery mode", () => {
    it("uses fetch-and-upload for torrent-file items instead of URL submission", async () => {
      const failedTorrentItem = createFailedTorrentFileItem("item-1", "Failed Torrent", "https://acg.rip/test.torrent")
      const record = createMockRecord("batch-1", [failedTorrentItem])
      record.sourceId = "acgrip" as const
      deps.getHistoryRecord = vi.fn(async () => record)

      const request: RetryRequest = { recordId: "batch-1" }
      const result = await retryFailedItems(request, deps)

      expect(result.successCount).toBe(1)
      expect(deps.fetchTorrentForUpload).toHaveBeenCalledWith("https://acg.rip/test.torrent")
      expect(deps.addTorrentFilesToQb).toHaveBeenCalledWith(
        expect.anything(),
        [{ filename: "test.torrent", blob: expect.any(Blob) }],
        undefined
      )
      expect(deps.addUrlsToQb).not.toHaveBeenCalled()
    })

    it("uses savePath for torrent-file uploads", async () => {
      const failedTorrentItem = createFailedTorrentFileItem("item-1", "Failed Torrent", "https://acg.rip/test.torrent")
      const record = {
        ...createMockRecord("batch-1", [failedTorrentItem]),
        sourceId: "acgrip" as const,
        savePath: "/downloads/anime"
      }
      deps.getHistoryRecord = vi.fn(async () => record)

      const request: RetryRequest = { recordId: "batch-1" }
      await retryFailedItems(request, deps)

      expect(deps.addTorrentFilesToQb).toHaveBeenCalledWith(
        expect.anything(),
        [{ filename: "test.torrent", blob: expect.any(Blob) }],
        { savePath: "/downloads/anime" }
      )
    })

    it("marks torrent-file item failed when fetch fails", async () => {
      const failedTorrentItem = createFailedTorrentFileItem("item-1", "Failed Torrent", "https://acg.rip/test.torrent")
      const record = createMockRecord("batch-1", [failedTorrentItem])
      record.sourceId = "acgrip" as const
      deps.getHistoryRecord = vi.fn(async () => record)
      deps.fetchTorrentForUpload = vi.fn(async () => { throw new Error("HTTP 404") })

      const request: RetryRequest = { recordId: "batch-1" }
      const result = await retryFailedItems(request, deps)

      expect(result.successCount).toBe(0)
      expect(result.failedCount).toBe(1)
      expect(deps.addTorrentFilesToQb).not.toHaveBeenCalled()
      const updatedRecord = (deps.updateHistoryRecord as Mock).mock.calls[0][0]
      expect(updatedRecord.items[0].status).toBe("failed")
      expect(updatedRecord.items[0].failure?.message).toContain("HTTP 404")
    })
  })
})