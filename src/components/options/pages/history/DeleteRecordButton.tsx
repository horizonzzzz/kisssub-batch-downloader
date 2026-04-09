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
import { HiOutlineTrash } from "react-icons/hi2"
import { sendRuntimeRequest } from "../../../../lib/shared/messages"

type DeleteRecordButtonProps = {
  recordId: string
  recordName: string
  onDeleted: () => void
  variant?: "icon" | "button"
}

export function DeleteRecordButton({
  recordId,
  recordName,
  onDeleted,
  variant = "icon"
}: DeleteRecordButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      const response = await sendRuntimeRequest({
        type: "DELETE_HISTORY_RECORD",
        recordId
      })
      if (response.ok) {
        onDeleted()
      } else {
        console.error("Failed to delete record:", response.error)
      }
    } finally {
      setLoading(false)
      setShowConfirm(false)
    }
  }

  return (
    <>
      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirm(true)}
          className="text-zinc-400 hover:text-red-600"
          title={i18n.t("options.history.deleteRecord.button")}
        >
          <HiOutlineTrash className="w-4 h-4" />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowConfirm(true)}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          <HiOutlineTrash className="w-4 h-4 mr-1" />
          {i18n.t("options.history.deleteRecord.button")}
        </Button>
      )}

      <AlertDialog open={showConfirm} onOpenChange={(open) => !loading && setShowConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.t("options.history.deleteRecord.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {i18n.t("options.history.deleteRecord.description", [recordName])}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{i18n.t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}>
              {loading ? i18n.t("common.processing") : i18n.t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
