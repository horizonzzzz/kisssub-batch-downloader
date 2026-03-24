import { useState } from "react"

type BatchPanelProps = {
  sourceName?: string
  isExpanded: boolean
  selectedCount: number
  running: boolean
  statusText: string
  savePath: string
  savePathHint?: string
  onToggleExpanded: (expanded: boolean) => void
  onSelectAll: () => void
  onClear: () => void
  onSavePathChange: (value: string) => void
  onClearSavePath: () => void
  onDownload: () => void
  onOpenSettings: () => void
}

function PanelIcon({ glyph }: { glyph: string }) {
  return <span className="kisssub-batch-panel__icon-glyph" aria-hidden="true">{glyph}</span>
}

export function BatchPanel({
  sourceName = "当前站点",
  isExpanded,
  selectedCount,
  running,
  statusText,
  savePath,
  savePathHint,
  onToggleExpanded,
  onSelectAll,
  onClear,
  onSavePathChange,
  onClearSavePath,
  onDownload,
  onOpenSettings
}: BatchPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const disablePathActions = running
  const disableClear = running || selectedCount === 0
  const disableDownload = running || selectedCount === 0

  if (!isExpanded) {
    return (
      <div className="kisssub-batch-launcher">
        <button
          type="button"
          className="kisssub-batch-launcher__button"
          aria-label="展开批量下载面板"
          onClick={() => {
            onToggleExpanded(true)
          }}>
          <span className="kisssub-batch-launcher__icon">
            <PanelIcon glyph="⇩" />
            {selectedCount > 0 ? (
              <span className="kisssub-batch-launcher__count" aria-label={`当前已选 ${selectedCount} 项`}>
                {selectedCount}
              </span>
            ) : null}
          </span>
          <span className="kisssub-batch-launcher__label">批量下载</span>
        </button>
      </div>
    )
  }

  return (
    <aside className="kisssub-batch-panel" aria-label="批量下载面板">
      <div className="kisssub-batch-panel__header">
        <div className="kisssub-batch-panel__header-copy">
          <p className="kisssub-batch-panel__eyebrow">Batch Downloader</p>
          <strong>{sourceName} 批量下载</strong>
        </div>
        <div className="kisssub-batch-panel__header-actions">
          <button
            type="button"
            className="kisssub-batch-panel__icon-button"
            aria-label="打开设置页"
            onClick={onOpenSettings}>
            <PanelIcon glyph="⚙" />
          </button>
          <button
            type="button"
            className="kisssub-batch-panel__icon-button"
            aria-label="最小化批量下载面板"
            onClick={() => {
              onToggleExpanded(false)
            }}>
            <PanelIcon glyph="▾" />
          </button>
        </div>
      </div>

      <div className="kisssub-batch-panel__body">
        <section className="kisssub-batch-panel__count-card" aria-live="polite">
          <span className="kisssub-batch-panel__count-value">{selectedCount}</span>
          <span className="kisssub-batch-panel__count-label">已选资源</span>
          <p className="kisssub-batch-panel__status-note">{statusText}</p>
        </section>

        <section
          className={
            showAdvanced
              ? "kisssub-batch-panel__advanced is-open"
              : "kisssub-batch-panel__advanced"
          }>
          <button
            type="button"
            className="kisssub-batch-panel__advanced-toggle"
            aria-expanded={showAdvanced}
            aria-controls="kisssub-batch-advanced-options"
            onClick={() => {
              setShowAdvanced((open) => !open)
            }}>
            <span>高级选项</span>
            <span className="kisssub-batch-panel__advanced-chevron" aria-hidden="true">
              {showAdvanced ? "▴" : "▾"}
            </span>
          </button>

          {showAdvanced ? (
            <div className="kisssub-batch-panel__advanced-body" id="kisssub-batch-advanced-options">
              <label className="kisssub-batch-panel__path-label" htmlFor="kisssub-batch-save-path">
                临时下载路径
              </label>
              <div className="kisssub-batch-panel__path-row">
                <input
                  id="kisssub-batch-save-path"
                  className="kisssub-batch-panel__path-input"
                  type="text"
                  value={savePath}
                  placeholder="留空使用默认目录"
                  onChange={(event) => {
                    onSavePathChange(event.target.value)
                  }}
                  disabled={disablePathActions}
                />
                <button
                  type="button"
                  className="kisssub-batch-panel__path-clear"
                  onClick={onClearSavePath}
                  disabled={disablePathActions || !savePath}>
                  清空路径
                </button>
              </div>
              <p className="kisssub-batch-panel__path-hint">
                {savePathHint ||
                  "留空则使用当前下载器默认目录。远程下载器请手动输入目标主机可识别的绝对路径。"}
              </p>
            </div>
          ) : null}
        </section>
      </div>

      <div className="kisssub-batch-panel__footer">
        <div className="kisssub-batch-panel__selection-actions">
          <button type="button" onClick={onSelectAll} disabled={running}>
            全选本页
          </button>
          <button type="button" onClick={onClear} disabled={disableClear}>
            清空选择
          </button>
        </div>
        <button
          type="button"
          className={running ? "kisssub-batch-panel__download is-running" : "kisssub-batch-panel__download"}
          onClick={onDownload}
          disabled={disableDownload}>
          {running ? "发送中..." : "批量下载"}
        </button>
      </div>
    </aside>
  )
}
