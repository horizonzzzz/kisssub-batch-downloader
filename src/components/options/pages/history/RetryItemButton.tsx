import { i18n } from "../../../../lib/i18n"
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
        title={i18n.t("options.history.retryItem.button")}
      >
        {loading ? (
          <span className="text-xs">{i18n.t("options.history.retryItem.loading")}</span>
        ) : (
          <>
            <HiOutlineArrowPath className="w-4 h-4 mr-1" />
            {i18n.t("common.retry")}
          </>
        )}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={(open) => !loading && setShowConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.t("options.history.retryItem.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">{i18n.t("options.history.retryItem.description")}</span>
              <span className="mt-1 block">
                {i18n.t("options.history.retryItem.downloaderHint", [currentDownloaderName])}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{i18n.t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              className="border-blue-600 bg-blue-600 hover:bg-blue-700"
              onClick={(event) => {
                event.preventDefault()
                void handleRetry()
              }}>
              {loading ? i18n.t("common.processing") : i18n.t("common.retry")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
