export type BatchPanelViewState = {
  advancedState: "open" | "closed"
  disablePathActions: boolean
  disableClear: boolean
  disableDownload: boolean
  downloadState: "idle" | "running"
}

type BatchPanelViewStateInput = {
  running: boolean
  selectedCount: number
  showAdvanced: boolean
}

export function getBatchPanelViewState({
  running,
  selectedCount,
  showAdvanced
}: BatchPanelViewStateInput): BatchPanelViewState {
  return {
    advancedState: showAdvanced ? "open" : "closed",
    disablePathActions: running,
    disableClear: running || selectedCount === 0,
    disableDownload: running || selectedCount === 0,
    downloadState: running ? "running" : "idle"
  }
}
