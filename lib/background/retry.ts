import { decideFilterGroupAction } from "../filter-rules"
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

function updateItemAfterFiltered(item: TaskHistoryItem, message: string): TaskHistoryItem {
  return {
    ...item,
    status: "filtered",
    message,
    failure: undefined
  }
}

function recalculateStats(items: TaskHistoryItem[]): TaskHistoryRecord["stats"] {
  const total = items.length
  const success = items.filter(i => i.status === "success").length
  const duplicated = items.filter(i => i.status === "duplicate").length
  const filtered = items.filter(i => i.status === "filtered").length
  const failed = items.filter(i => i.status === "failed").length
  return { total, success, duplicated, filtered, failed }
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
    ? record.items.filter(i => request.itemIds!.includes(i.id) && i.status === "failed")
    : record.items.filter(i => i.status === "failed")

  if (targetItems.length === 0) {
    return {
      successCount: 0,
      failedCount: 0,
      updatedRecord: record
    }
  }

  const settings = await deps.getSettings()
  const urlItems: { item: TaskHistoryItem; url: string }[] = []
  const torrentFileItems: { item: TaskHistoryItem; url: string }[] = []
  const filteredItems: TaskHistoryItem[] = []
  const itemsWithoutUrls: TaskHistoryItem[] = []

  for (const item of targetItems) {
    const ruleDecision = decideFilterGroupAction({
      sourceId: item.sourceId,
      title: item.title,
      groups: settings.filterGroups
    })
    if (!ruleDecision.accepted) {
      filteredItems.push(
        updateItemAfterFiltered(
          item,
          getFilterDecisionMessage(ruleDecision)
        )
      )
      continue
    }

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

    const filtered = filteredItems.find(w => w.id === item.id)
    if (filtered) return filtered

    const withoutUrl = itemsWithoutUrls.find(w => w.id === item.id)
    if (withoutUrl) return withoutUrl

    return item
  })

  const savePathOption = record.savePath ? { savePath: record.savePath } : undefined

  if (urlItems.length > 0 || torrentFileItems.length > 0) {
    try {
      await deps.loginQb(settings)
    } catch (error) {
      throw new Error(`qBittorrent 登录失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

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

function getFilterDecisionMessage(
  ruleDecision: ReturnType<typeof decideFilterGroupAction>
): string {
  if (ruleDecision.matchedGroup && ruleDecision.matchedRule) {
    return `Filtered by group: ${ruleDecision.matchedGroup.name} / rule: ${ruleDecision.matchedRule.name}`
  }

  return ruleDecision.message || "Filtered by default strategy."
}
