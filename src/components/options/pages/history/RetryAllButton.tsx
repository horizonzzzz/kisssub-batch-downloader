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
import type { TaskHistoryRecord } from "../../../../lib/history/types"
import type { DownloaderId } from "../../../../lib/shared/types"

type RetryAllButtonProps = {
  currentDownloaderId: DownloaderId
  record: TaskHistoryRecord
  onRetryComplete: () => void
}

export function RetryAllButton({ currentDownloaderId, record, onRetryComplete }: RetryAllButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const currentDownloaderName = getDownloaderMeta(currentDownloaderId).displayName

  const failedCount = record.items.filter(
    (item) => item.status === "failed" && (item.failure ? item.failure.retryable : true)
  ).length

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
        {i18n.t("options.history.retryAll.button")}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={(open) => !loading && setShowConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.t("options.history.retryAll.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="block">{i18n.t("options.history.retryAll.description", [failedCount])}</span>
              <span className="mt-1 block">
                {i18n.t("options.history.retryAll.downloaderHint", [currentDownloaderName])}
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
