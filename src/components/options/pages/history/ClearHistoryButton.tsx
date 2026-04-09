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

type ClearHistoryButtonProps = {
  onCleared: () => void
  disabled?: boolean
}

export function ClearHistoryButton({ onCleared, disabled = false }: ClearHistoryButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleClear = async () => {
    setLoading(true)
    try {
      const response = await sendRuntimeRequest({
        type: "CLEAR_HISTORY"
      })
      if (response.ok) {
        onCleared()
      } else {
        console.error("Failed to clear history:", response.error)
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
        disabled={disabled}
        className="text-red-600 border-red-300 hover:bg-red-50"
      >
        <HiOutlineTrash className="w-4 h-4 mr-1" />
        {i18n.t("options.history.clear.button")}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={(open) => !loading && setShowConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.t("options.history.clear.title")}</AlertDialogTitle>
            <AlertDialogDescription>{i18n.t("options.history.clear.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{i18n.t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={(event) => {
                event.preventDefault()
                void handleClear()
              }}>
              {loading ? i18n.t("common.processing") : i18n.t("options.history.clear.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
