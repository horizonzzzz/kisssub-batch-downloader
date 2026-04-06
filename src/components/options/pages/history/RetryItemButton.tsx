import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button
} from "../../../ui"
import { HiOutlineArrowPath } from "react-icons/hi2"
import { getDownloaderMeta } from "../../../../lib/downloader"
import { sendRuntimeRequest } from "../../../../lib/shared/messages"
import type { TaskHistoryItem, TaskHistoryRecord } from "../../../../lib/history/types"
import type { DownloaderId } from "../../../../lib/shared/types"

type RetryItemButtonProps = {
  currentDownloaderId: DownloaderId
  record: TaskHistoryRecord
  item: TaskHistoryItem
  onRetryComplete: () => void
}

export function RetryItemButton({ currentDownloaderId, record, item, onRetryComplete }: RetryItemButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const currentDownloaderName = getDownloaderMeta(currentDownloaderId).displayName

  if (item.status !== "failed" || item.failure?.retryable === false) {
    return null
  }

  const handleRetry = async () => {
    setLoading(true)
    try {
      const response = await sendRuntimeRequest({
        type: "RETRY_FAILED_ITEMS",
        recordId: record.id,
        itemIds: [item.id]
      })
      if (response.ok) {
        onRetryComplete()
      } else {
        console.error("Retry failed:", response.error)
        onRetryComplete()
      }
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        title="重试此条目"
      >
        {loading ? (
          <span className="text-xs">重试中...</span>
        ) : (
          <>
            <HiOutlineArrowPath className="w-4 h-4 mr-1" />
            重试
          </>
        )}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={(open) => !loading && setShowConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重试失败条目</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">确定重试当前失败条目吗？</span>
              <span className="mt-1 block">{`将使用当前配置的下载器 ${currentDownloaderName} 重新提交。`}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              className="border-blue-600 bg-blue-600 hover:bg-blue-700"
              onClick={(event) => {
                event.preventDefault()
                void handleRetry()
              }}>
              {loading ? "处理中..." : "重试"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
