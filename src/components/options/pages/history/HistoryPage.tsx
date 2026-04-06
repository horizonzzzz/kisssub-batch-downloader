import { useEffect, useState } from "react"
import type { TaskHistoryRecord } from "../../../../lib/history/types"
import { sendRuntimeRequest } from "../../../../lib/shared/messages"
import type { DownloaderId } from "../../../../lib/shared/types"
import { HistoryListView } from "./HistoryListView"
import { HistoryDetailView } from "./HistoryDetailView"

export function HistoryPage() {
  const [records, setRecords] = useState<TaskHistoryRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<TaskHistoryRecord | null>(null)
  const [currentDownloaderId, setCurrentDownloaderId] = useState<DownloaderId>("qbittorrent")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadRecords() {
    try {
      const [historyResponse, settingsResponse] = await Promise.all([
        sendRuntimeRequest({ type: "GET_HISTORY" }),
        sendRuntimeRequest({ type: "GET_SETTINGS" })
      ])

      if (!historyResponse.ok) {
        setError(historyResponse.error)
        return
      }

      setRecords(historyResponse.records)
      if (selectedRecord) {
        const updated = historyResponse.records.find((r) => r.id === selectedRecord.id)
        setSelectedRecord(updated ?? null)
      }

      if (settingsResponse.ok && settingsResponse.settings?.currentDownloaderId) {
        setCurrentDownloaderId(settingsResponse.settings.currentDownloaderId)
      }
    } catch {
      setError("加载历史记录失败")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecords()
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
        currentDownloaderId={currentDownloaderId}
        onBack={() => setSelectedRecord(null)}
        onRecordChanged={loadRecords}
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
      onRefresh={loadRecords}
    />
  )
}
