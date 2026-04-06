import type { FailureReason, TaskHistoryItem, TaskHistoryRecord } from "../../../../lib/history/types"
import { getDownloaderMeta } from "../../../../lib/downloader"
import { SITE_CONFIG_META } from "../../../../lib/sources/site-meta"
import { cn } from "../../../../lib/shared/cn"
import type { DownloaderId } from "../../../../lib/shared/types"
import { Button } from "../../../ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../../../ui/card"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "../../../ui/tooltip"
import {
  HiOutlineArrowLeft,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentDuplicate,
  HiOutlineExclamationTriangle,
  HiOutlineGlobeAlt,
  HiOutlineXCircle
} from "react-icons/hi2"
import { getFailureExplanation } from "./FailureExplanation"
import { DeleteRecordButton } from "./DeleteRecordButton"
import { RetryAllButton } from "./RetryAllButton"
import { RetryItemButton } from "./RetryItemButton"

type HistoryDetailViewProps = {
  currentDownloaderId: DownloaderId
  record: TaskHistoryRecord
  onBack: () => void
  onRecordChanged: () => void
}

function getDownloaderDisplayName(
  downloaderId: DownloaderId | undefined,
  fallbackText: string
): string {
  if (!downloaderId) {
    return fallbackText
  }

  try {
    return getDownloaderMeta(downloaderId).displayName
  } catch {
    return fallbackText
  }
}

function StatusBadge({ status }: { status: TaskHistoryRecord["status"] }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <HiOutlineCheckCircle className="w-3.5 h-3.5" />
        已完成
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      <HiOutlineExclamationTriangle className="w-3.5 h-3.5" />
      部分失败
    </span>
  )
}

function ItemStatusIcon({ status }: { status: TaskHistoryItem["status"] }) {
  if (status === "success") {
    return <HiOutlineCheckCircle className="w-4 h-4 text-emerald-500" />
  }
  if (status === "duplicate") {
    return <HiOutlineDocumentDuplicate className="w-4 h-4 text-blue-500" />
  }
  return <HiOutlineXCircle className="w-4 h-4 text-red-500" />
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  })
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  })
}

function aggregateFailures(items: TaskHistoryItem[]): Map<FailureReason, { count: number; reason: FailureReason }> {
  const map = new Map<FailureReason, { count: number; reason: FailureReason }>()
  for (const item of items) {
    if (item.status === "failed" && item.failure) {
      const key = item.failure.reason
      const existing = map.get(key)
      if (existing) {
        existing.count += 1
      } else {
        map.set(key, { count: 1, reason: key })
      }
    }
  }
  return map
}

export function HistoryDetailView({ currentDownloaderId, record, onBack, onRecordChanged }: HistoryDetailViewProps) {
  const siteMeta = SITE_CONFIG_META[record.sourceId]
  const failures = aggregateFailures(record.items)
  const hasFailures = record.stats.failed > 0
  const originalDownloaderName = getDownloaderDisplayName(record.originalDownloaderId, "未知（旧记录）")
  const lastRetriedDownloaderName = getDownloaderDisplayName(record.lastRetriedDownloaderId, "未重试")

  const handleDeleted = () => {
    onRecordChanged()
    onBack()
  }

  return (
    <TooltipProvider>
      <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <HiOutlineArrowLeft className="w-4 h-4" />
          返回
        </Button>
        <span className="text-lg font-medium text-zinc-900 truncate">{record.name}</span>
        <StatusBadge status={record.status} />
        <DeleteRecordButton
          recordId={record.id}
          recordName={record.name}
          onDeleted={handleDeleted}
          variant="button"
        />
        <div className="flex items-center gap-1.5 text-sm text-zinc-500 ml-auto">
          <HiOutlineGlobeAlt className="w-4 h-4" />
          <span>{siteMeta?.displayName ?? record.sourceId}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-zinc-900">{record.stats.total}</div>
            <div className="text-xs text-zinc-500 mt-1">总条目</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{record.stats.success}</div>
            <div className="text-xs text-zinc-500 mt-1">成功</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{record.stats.duplicated}</div>
            <div className="text-xs text-zinc-500 mt-1">重复</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{record.stats.failed}</div>
            <div className="text-xs text-zinc-500 mt-1">失败</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <HiOutlineClock className="w-4 h-4" />
        <span>{formatDate(record.createdAt)}</span>
        <span>{formatTime(record.createdAt)}</span>
        {record.completedAt && (
          <>
            <span className="text-zinc-400">→</span>
            <span>{formatTime(record.completedAt)}</span>
          </>
        )}
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 text-sm text-zinc-700 md:grid-cols-2">
          <div className="grid gap-1">
            <span className="text-xs text-zinc-500">原始提交下载器</span>
            <span className="font-medium text-zinc-900">{originalDownloaderName}</span>
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-zinc-500">最近重试下载器</span>
            <span className="font-medium text-zinc-900">{lastRetriedDownloaderName}</span>
          </div>
        </CardContent>
      </Card>

      {hasFailures && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <HiOutlineExclamationTriangle className="w-4 h-4 text-red-500" />
              失败原因汇总
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {Array.from(failures.values()).map(({ count, reason }) => {
              const explanation = getFailureExplanation(reason)
              return (
                <div key={reason} className="grid gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-zinc-900">{explanation.label}</span>
                    <span className="text-xs text-zinc-500">{count} 条</span>
                  </div>
                  <div className="text-xs text-zinc-600">{explanation.desc}</div>
                  <div className="text-xs text-zinc-500">{explanation.suggestion}</div>
                </div>
              )
            })}
            <RetryAllButton
              currentDownloaderId={currentDownloaderId}
              record={record}
              onRetryComplete={() => onRecordChanged()}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">条目详情</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {record.items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "grid grid-cols-12 items-center gap-2 px-3 py-2 rounded border",
                item.status === "failed"
                  ? "bg-red-50/50 border-red-100"
                  : item.status === "duplicate"
                  ? "bg-blue-50/50 border-blue-100"
                  : "bg-white border-zinc-100"
              )}
            >
              <div className="col-span-1 flex justify-center">
                <ItemStatusIcon status={item.status} />
              </div>
              <div className="col-span-7 min-w-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm text-zinc-900 truncate block cursor-default">{item.title}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{item.title}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="col-span-2 flex justify-center">
                <a
                  href={item.detailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  title="在源站查看详情"
                >
                  <HiOutlineArrowTopRightOnSquare className="w-3.5 h-3.5" />
                  详情
                </a>
              </div>
              <div className="col-span-2 flex justify-end">
                {item.status === "failed" && (
                  <RetryItemButton
                    currentDownloaderId={currentDownloaderId}
                    item={item}
                    record={record}
                    onRetryComplete={() => onRecordChanged()}
                  />
                )}
              </div>
              {item.status === "failed" && item.failure && (
                <div className="col-span-12 mt-1 px-2 py-1.5 rounded bg-red-100 text-xs text-red-700">
                  {item.failure.message}
                </div>
              )}
              {item.status === "duplicate" && (
                <div className="col-span-12 mt-1 px-2 py-1.5 rounded bg-blue-100 text-xs text-blue-700">
                  {item.message || "该条目已在 qBittorrent 中存在，跳过提交"}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  )
}
