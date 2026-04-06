import type { TaskHistoryRecord } from "../../../../lib/history/types"
import { SITE_CONFIG_META } from "../../../../lib/sources/site-meta"
import { cn } from "../../../../lib/shared/cn"
import { Button } from "../../../ui/button"
import { HiOutlineClock, HiOutlineGlobeAlt } from "react-icons/hi2"
import { DeleteRecordButton } from "./DeleteRecordButton"
import { ClearHistoryButton } from "./ClearHistoryButton"

type HistoryListViewProps = {
  records: TaskHistoryRecord[]
  onViewDetail: (recordId: string) => void
  onRefresh: () => void
}

function StatusDot({ status }: { status: TaskHistoryRecord["status"] }) {
  return (
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        status === "completed" ? "bg-emerald-500" : "bg-red-500"
      )}
    />
  )
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

function formatStats(stats: TaskHistoryRecord["stats"]): string {
  return `${stats.success}/${stats.total}`
}

export function HistoryListView({ records, onViewDetail, onRefresh }: HistoryListViewProps) {
  if (records.length === 0) {
    return (
      <div className="grid gap-2">
        <div className="flex justify-end mb-2">
          <ClearHistoryButton onCleared={onRefresh} disabled />
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
          <HiOutlineClock className="w-10 h-10 mb-3 opacity-50" />
          <p className="text-sm">暂无下载历史记录</p>
          <p className="text-xs mt-1 text-zinc-400">开始批量下载后，历史记录将在此显示</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-2">
      <div className="flex justify-end mb-2">
        <ClearHistoryButton onCleared={onRefresh} disabled={records.length === 0} />
      </div>
      {records.map((record, index) => {
        const siteMeta = SITE_CONFIG_META[record.sourceId]
        const isLatest = index === 0

        return (
          <div
            key={record.id}
            className={cn(
              "grid grid-cols-12 items-center gap-3 px-3 py-2.5 rounded border",
              isLatest
                ? "bg-blue-50/50 border-blue-100"
                : "bg-white border-zinc-100 hover:bg-zinc-50"
            )}
          >
            <div className="col-span-5 flex items-center gap-2">
              <StatusDot status={record.status} />
              <span className="text-sm font-medium text-zinc-900 truncate">
                {record.name}
              </span>
              {isLatest && (
                <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                  最新
                </span>
              )}
            </div>

            <div className="col-span-2 flex items-center gap-1.5 text-sm text-zinc-600">
              <HiOutlineGlobeAlt className="w-4 h-4 opacity-70" />
              <span className="truncate">{siteMeta?.displayName ?? record.sourceId}</span>
            </div>

            <div className="col-span-1 flex flex-col gap-0.5">
              <span className="text-sm text-zinc-900">{formatDate(record.createdAt)}</span>
              <span className="text-xs text-zinc-500">{formatTime(record.createdAt)}</span>
            </div>

            <div className="col-span-2 flex items-center gap-2 text-sm">
              <span className="font-medium text-zinc-900">{formatStats(record.stats)}</span>
              <span className="text-zinc-500">成功</span>
              {record.stats.failed > 0 && (
                <span className="text-red-600">{record.stats.failed} 失败</span>
              )}
            </div>

            <div className="col-span-2 flex items-center justify-end gap-1">
               <DeleteRecordButton
                 recordId={record.id}
                 recordName={record.name}
                 onDeleted={onRefresh}
                 variant="icon"
               />
               <Button
                 variant="ghost"
                 size="sm"
                 onClick={() => onViewDetail(record.id)}
                 className="text-xs"
               >
                 详情
               </Button>
             </div>
          </div>
        )
      })}
    </div>
  )
}
