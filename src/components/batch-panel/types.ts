export type BatchPanelFilterStatusItem = {
  id: string
  name: string
  summary: string
}

export type BatchPanelFilterStatus = {
  summaryText: string
  emptyStateText: string | null
  filters: BatchPanelFilterStatusItem[]
}

export type BatchPanelProps = {
  sourceName?: string
  isExpanded: boolean
  selectedCount: number
  selectableCount?: number
  running: boolean
  statusText: string
  savePath: string
  savePathHint?: string
  filterStatus: BatchPanelFilterStatus
  onToggleExpanded: (expanded: boolean) => void
  onSelectAll: () => void
  onClear: () => void
  onSavePathChange: (value: string) => void
  onClearSavePath: () => void
  onDownload: () => void
  onOpenSettings: () => void
}
