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
import { sendRuntimeRequest } from "../../../../lib/shared/messages"
import type { TaskHistoryRecord } from "../../../../lib/history/types"

type RetryAllButtonProps = {
  record: TaskHistoryRecord
  onRetryComplete: () => void
}

export function RetryAllButton({ record, onRetryComplete }: RetryAllButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const failedCount = record.items.filter(i => i.status === "failed").length

  if (failedCount === 0) {
    return null
  }

  const handleRetry = async () => {
    setLoading(true)
    try {
      const response = await sendRuntimeRequest({
        type: "RETRY_FAILED_ITEMS",
        recordId: record.id
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
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(true)}
        disabled={loading}
      >
        <HiOutlineArrowPath className="w-4 h-4 mr-1" />
        重试全部失败项
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={(open) => !loading && setShowConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重试失败条目</AlertDialogTitle>
            <AlertDialogDescription>{`确定重试 ${failedCount} 个失败条目吗？`}</AlertDialogDescription>
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
