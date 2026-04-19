import { i18n } from "../i18n"
import type { DownloaderAdapter, DownloaderTorrentFile } from "../downloader"
import type { DownloaderConfig } from "../downloader/config/types"
import type { TaskHistoryItem, TaskHistoryRecord } from "../history/types"

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
  getDownloaderConfig: () => Promise<DownloaderConfig>
  getHistoryRecord: (recordId: string) => Promise<TaskHistoryRecord | null>
  updateHistoryRecord: (record: TaskHistoryRecord) => Promise<void>
  getDownloader: (config: DownloaderConfig) => DownloaderAdapter
  ensureDownloaderPermission: (config: DownloaderConfig) => Promise<void>
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
  return resultMessage || i18n.t("options.history.retryErrors.noSubmissionResult")
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
    throw new Error(i18n.t("options.history.retryErrors.recordNotFound"))
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

  const downloaderConfig = await deps.getDownloaderConfig()
  const downloader = deps.getDownloader(downloaderConfig)
  const urlItems: { item: TaskHistoryItem; url: string }[] = []
  const torrentFileItems: { item: TaskHistoryItem; url: string }[] = []
  const itemsWithoutUrls: TaskHistoryItem[] = []

  for (const item of targetItems) {
    const url = getSubmitUrl(item)
    if (!url) {
      itemsWithoutUrls.push(updateItemAfterFailure(item, i18n.t("options.history.retryErrors.noUsableUrl")))
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
      await deps.ensureDownloaderPermission(downloaderConfig)
      await downloader.authenticate(downloaderConfig)
    } catch (error) {
      throw new Error(i18n.t("options.history.retryErrors.authFailed", [error instanceof Error ? error.message : String(error)]))
    }
  }

  if (urlItems.length > 0) {
    for (const { item, url } of urlItems) {
      try {
        const result = await downloader.addUrls(downloaderConfig, [url], savePathOption)
        const submission = result.entries[0]
        const index = updatedItems.findIndex(i => i.id === item.id)
        if (submission?.status === "submitted") {
          if (index !== -1) {
            updatedItems[index] = updateItemAfterSuccess(item)
          }
          successCount++
          continue
        }

        const message = i18n.t("options.history.retryErrors.submitFailed", [getUrlSubmissionFailure(submission?.error)])
        if (index !== -1) {
          updatedItems[index] = updateItemAfterFailure(item, message)
        }
        failedCount++
      } catch (error) {
        const message = i18n.t("options.history.retryErrors.submitFailed", [error instanceof Error ? error.message : String(error)])
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
        await downloader.addTorrentFiles(downloaderConfig, [torrent], savePathOption)
        const index = updatedItems.findIndex(i => i.id === item.id)
        if (index !== -1) {
          updatedItems[index] = updateItemAfterSuccess(item)
        }
        successCount++
      } catch (error) {
        const message = i18n.t("options.history.retryErrors.submitFailed", [error instanceof Error ? error.message : String(error)])
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
    lastRetriedDownloaderId: downloaderConfig.activeId,
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
