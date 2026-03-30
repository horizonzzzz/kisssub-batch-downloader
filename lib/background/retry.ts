import type { QbTorrentFile } from "../downloader/qb"
import type { TaskHistoryItem, TaskHistoryRecord } from "../history/types"
import type { Settings } from "../shared/types"

export type RetryRequest = {
  recordId: string
  itemIds?: string[]
}

export type RetryResult = {
  successCount: number
  failedCount: number
  updatedRecord: TaskHistoryRecord
}

export type RetryDependencies = {
  getSettings: () => Promise<Settings>
  getHistoryRecord: (recordId: string) => Promise<TaskHistoryRecord | null>
  updateHistoryRecord: (record: TaskHistoryRecord) => Promise<void>
  loginQb: (settings: Settings) => Promise<void>
  addUrlsToQb: (settings: Settings, urls: string[], options?: { savePath?: string }) => Promise<void>
  fetchTorrentForUpload: (torrentUrl: string) => Promise<QbTorrentFile>
  addTorrentFilesToQb: (settings: Settings, torrents: QbTorrentFile[], options?: { savePath?: string }) => Promise<void>
}

function getSubmitUrl(item: TaskHistoryItem): string | null {
  if (item.magnetUrl) return item.magnetUrl
  if (item.torrentUrl) return item.torrentUrl
  return null
}

function isTorrentFileItem(item: TaskHistoryItem): boolean {
  return item.deliveryMode === "torrent-file" && !!item.torrentUrl
}

function updateItemAfterSuccess(item: TaskHistoryItem): TaskHistoryItem {
  return {
    ...item,
    status: "success",
    failure: undefined
  }
}

function updateItemAfterFailure(item: TaskHistoryItem, message: string): TaskHistoryItem {
  const now = new Date().toISOString()
  return {
    ...item,
    status: "failed",
    failure: {
      reason: item.failure?.reason ?? "unknown",
      message,
      retryable: true,
      retryCount: (item.failure?.retryCount ?? 0) + 1,
      lastRetryAt: now
    }
  }
}

function recalculateStats(items: TaskHistoryItem[]): TaskHistoryRecord["stats"] {
  const total = items.length
  const success = items.filter(i => i.status === "success").length
  const duplicated = items.filter(i => i.status === "duplicate").length
  const failed = items.filter(i => i.status === "failed").length
  return { total, success, duplicated, failed }
}

export async function retryFailedItems(
  request: RetryRequest,
  deps: RetryDependencies
): Promise<RetryResult> {
  const record = await deps.getHistoryRecord(request.recordId)
  if (!record) {
    throw new Error("历史记录不存在")
  }

  const targetItems = request.itemIds
    ? record.items.filter(i => request.itemIds!.includes(i.id))
    : record.items.filter(i => i.status === "failed")

  if (targetItems.length === 0) {
    return {
      successCount: 0,
      failedCount: 0,
      updatedRecord: record
    }
  }

  const urlItems: { item: TaskHistoryItem; url: string }[] = []
  const torrentFileItems: { item: TaskHistoryItem; url: string }[] = []
  const itemsWithoutUrls: TaskHistoryItem[] = []

  for (const item of targetItems) {
    const url = getSubmitUrl(item)
    if (!url) {
      itemsWithoutUrls.push(updateItemAfterFailure(item, "无可用的 magnet 或 torrent 链接"))
      continue
    }

    if (isTorrentFileItem(item)) {
      torrentFileItems.push({ item, url })
    } else {
      urlItems.push({ item, url })
    }
  }

  const settings = await deps.getSettings()

  try {
    await deps.loginQb(settings)
  } catch (error) {
    throw new Error(`qBittorrent 登录失败: ${error instanceof Error ? error.message : String(error)}`)
  }

  let successCount = 0
  let failedCount = itemsWithoutUrls.length
  const updatedItems: TaskHistoryItem[] = record.items.map(item => {
    const wasTarget = targetItems.some(t => t.id === item.id)
    if (!wasTarget) return item

    const withoutUrl = itemsWithoutUrls.find(w => w.id === item.id)
    if (withoutUrl) return withoutUrl

    return item
  })

  const savePathOption = record.savePath ? { savePath: record.savePath } : undefined

  if (urlItems.length > 0) {
    for (const { item, url } of urlItems) {
      try {
        await deps.addUrlsToQb(settings, [url], savePathOption)
        const index = updatedItems.findIndex(i => i.id === item.id)
        if (index !== -1) {
          updatedItems[index] = updateItemAfterSuccess(item)
        }
        successCount++
      } catch (error) {
        const message = `qBittorrent 提交失败: ${error instanceof Error ? error.message : String(error)}`
        const index = updatedItems.findIndex(i => i.id === item.id)
        if (index !== -1) {
          updatedItems[index] = updateItemAfterFailure(item, message)
        }
        failedCount++
      }
    }
  }

  if (torrentFileItems.length > 0) {
    for (const { item, url } of torrentFileItems) {
      try {
        const torrent = await deps.fetchTorrentForUpload(url)
        await deps.addTorrentFilesToQb(settings, [torrent], savePathOption)
        const index = updatedItems.findIndex(i => i.id === item.id)
        if (index !== -1) {
          updatedItems[index] = updateItemAfterSuccess(item)
        }
        successCount++
      } catch (error) {
        const message = `qBittorrent 提交失败: ${error instanceof Error ? error.message : String(error)}`
        const index = updatedItems.findIndex(i => i.id === item.id)
        if (index !== -1) {
          updatedItems[index] = updateItemAfterFailure(item, message)
        }
        failedCount++
      }
    }
  }

  const stats = recalculateStats(updatedItems)
  const status = stats.failed > 0 ? "partial_failure" : "completed"
  const updatedRecord: TaskHistoryRecord = {
    ...record,
    items: updatedItems,
    stats,
    status
  }

  await deps.updateHistoryRecord(updatedRecord)

  return {
    successCount,
    failedCount,
    updatedRecord
  }
}