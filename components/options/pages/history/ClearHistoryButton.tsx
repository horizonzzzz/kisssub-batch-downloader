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
        清空历史
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={(open) => !loading && setShowConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空全部历史</AlertDialogTitle>
            <AlertDialogDescription>确定清空所有历史记录吗？此操作不可恢复。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={(event) => {
                event.preventDefault()
                void handleClear()
              }}>
              {loading ? "处理中..." : "清空全部"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
