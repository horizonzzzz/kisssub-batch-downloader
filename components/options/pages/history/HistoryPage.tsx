import { useEffect, useState } from "react"
import type { TaskHistoryRecord } from "../../../../lib/history/types"
import { sendRuntimeRequest } from "../../../../lib/shared/messages"
import { HistoryListView } from "./HistoryListView"
import { HistoryDetailView } from "./HistoryDetailView"

export function HistoryPage() {
  const [records, setRecords] = useState<TaskHistoryRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<TaskHistoryRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await sendRuntimeRequest({ type: "GET_HISTORY" })
        if (!response.ok) {
          setError(response.error)
          return
        }
        setRecords(response.records)
      } catch {
        setError("加载历史记录失败")
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500">
        加载中...
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-600">
        {error}
      </div>
    )
  }

  if (selectedRecord) {
    return (
      <HistoryDetailView
        record={selectedRecord}
        onBack={() => setSelectedRecord(null)}
      />
    )
  }

  return (
    <HistoryListView
      records={records}
      onViewDetail={(recordId) => {
        const record = records.find((r) => r.id === recordId)
        if (record) {
          setSelectedRecord(record)
        }
      }}
    />
  )
}