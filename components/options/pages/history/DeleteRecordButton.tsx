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
          title="删除记录"
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
          删除记录
        </Button>
      )}

      <AlertDialog open={showConfirm} onOpenChange={(open) => !loading && setShowConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除历史记录</AlertDialogTitle>
            <AlertDialogDescription>{`确定删除"${recordName}"吗？此操作不可恢复。`}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={loading}
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}>
              {loading ? "处理中..." : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
