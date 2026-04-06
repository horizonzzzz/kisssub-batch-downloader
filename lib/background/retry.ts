import type { DownloaderAdapter, DownloaderTorrentFile } from "../downloader"
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
  getDownloader: (settings: Settings) => DownloaderAdapter
  fetchTorrentForUpload: (torrentUrl: string) => Promise<DownloaderTorrentFile>
}

function getSubmitUrl(item: TaskHistoryItem): string | null {
  if (item.deliveryMode === "torrent-file" || item.deliveryMode === "torrent-url") {
    return item.torrentUrl ?? null
  }

  return item.magnetUrl ?? null
}

function isTorrentFileItem(item: TaskHistoryItem): boolean {
  return item.deliveryMode === "torrent-file"
}

function isRetryableFailedItem(item: TaskHistoryItem): boolean {
  return item.status === "failed" && (item.failure ? item.failure.retryable : true)
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

function getUrlSubmissionFailure(resultMessage?: string): string {
  return resultMessage || "下载器未返回提交结果"
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
    ? record.items.filter(i => request.itemIds!.includes(i.id) && isRetryableFailedItem(i))
    : record.items.filter(isRetryableFailedItem)

  if (targetItems.length === 0) {
    return {
      successCount: 0,
      failedCount: 0,
      updatedRecord: record
    }
  }

  const settings = await deps.getSettings()
  const downloader = deps.getDownloader(settings)
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

  if (urlItems.length > 0 || torrentFileItems.length > 0) {
    try {
      await downloader.authenticate(settings)
    } catch (error) {
      throw new Error(`下载器登录失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (urlItems.length > 0) {
    for (const { item, url } of urlItems) {
      try {
        const result = await downloader.addUrls(settings, [url], savePathOption)
        const submission = result.entries[0]
        const index = updatedItems.findIndex(i => i.id === item.id)
        if (submission?.status === "submitted") {
          if (index !== -1) {
            updatedItems[index] = updateItemAfterSuccess(item)
          }
          successCount++
          continue
        }

        const message = `下载器提交失败: ${getUrlSubmissionFailure(submission?.error)}`
        if (index !== -1) {
          updatedItems[index] = updateItemAfterFailure(item, message)
        }
        failedCount++
      } catch (error) {
        const message = `下载器提交失败: ${error instanceof Error ? error.message : String(error)}`
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
        await downloader.addTorrentFiles(settings, [torrent], savePathOption)
        const index = updatedItems.findIndex(i => i.id === item.id)
        if (index !== -1) {
          updatedItems[index] = updateItemAfterSuccess(item)
        }
        successCount++
      } catch (error) {
        const message = `下载器提交失败: ${error instanceof Error ? error.message : String(error)}`
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
