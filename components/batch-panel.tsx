import { useState } from "react"
import { HiChevronDown, HiChevronUp, HiOutlineCog6Tooth } from "react-icons/hi2"

import speedlineBrandIcon from "../assets/anime-bt-icon-speedline.svg"
import { cn } from "../lib/utils"

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
  const advancedOptionsId = "anime-bt-batch-advanced-options"
  const savePathInputId = "anime-bt-batch-save-path"
  const [showAdvanced, setShowAdvanced] = useState(false)
  const disablePathActions = running
  const disableClear = running || selectedCount === 0
  const disableDownload = running || selectedCount === 0

  if (!isExpanded) {
    return (
      <div className="anime-bt-content-root anime-bt-batch-panel">
        <div className="anime-bt-batch-panel__launcher">
          <button
            type="button"
            className="anime-bt-batch-panel__launcher-button"
            aria-label="展开批量下载面板"
            onClick={() => {
              onToggleExpanded(true)
            }}>
            <span className="anime-bt-batch-panel__launcher-icon">
              <img
                src={speedlineBrandIcon}
                alt=""
                loading="eager"
                decoding="async"
                data-testid="batch-launcher-brand-icon"
                className="anime-bt-batch-panel__launcher-brand-icon"
                aria-hidden="true"
              />
              {selectedCount > 0 ? (
                <span className="anime-bt-batch-panel__launcher-count" aria-label={`当前已选 ${selectedCount} 项`}>
                  {selectedCount}
                </span>
              ) : null}
            </span>
            <span className="anime-bt-batch-panel__launcher-label">批量下载</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="anime-bt-content-root anime-bt-batch-panel">
      <aside className="anime-bt-batch-panel__surface" aria-label="批量下载面板">
        <div className="anime-bt-batch-panel__header">
          <div className="anime-bt-batch-panel__header-copy">
            <div className="anime-bt-batch-panel__brand-lockup">
              <span className="anime-bt-batch-panel__brand-badge">
                <img
                  src={speedlineBrandIcon}
                  alt=""
                  loading="eager"
                  decoding="async"
                  data-testid="batch-panel-brand-icon"
                  className="anime-bt-batch-panel__brand-icon"
                  aria-hidden="true"
                />
              </span>
              <p className="anime-bt-batch-panel__eyebrow">Batch Downloader</p>
            </div>
            <strong>{sourceName} 批量下载</strong>
          </div>

          <div className="anime-bt-batch-panel__header-actions">
            <button
              type="button"
              className="anime-bt-batch-panel__icon-button"
              aria-label="打开设置页"
              onClick={onOpenSettings}>
              <HiOutlineCog6Tooth
                className="anime-bt-batch-panel__icon-button-icon"
                aria-hidden="true"
                focusable="false"
              />
            </button>
            <button
              type="button"
              className="anime-bt-batch-panel__icon-button"
              aria-label="最小化批量下载面板"
              onClick={() => {
                onToggleExpanded(false)
              }}>
              <HiChevronDown
                className="anime-bt-batch-panel__icon-button-icon"
                aria-hidden="true"
                focusable="false"
              />
            </button>
          </div>
        </div>

        <div className="anime-bt-batch-panel__body">
          <section className="anime-bt-batch-panel__count-card" aria-live="polite">
            <span className="anime-bt-batch-panel__count-value">{selectedCount}</span>
            <span className="anime-bt-batch-panel__count-label">已选资源</span>
            <p className="anime-bt-batch-panel__status-note">{statusText}</p>
          </section>

          <section
            className={cn("anime-bt-batch-panel__advanced", showAdvanced && "is-open")}>
            <button
              type="button"
              className="anime-bt-batch-panel__advanced-toggle"
              aria-expanded={showAdvanced}
              aria-controls={advancedOptionsId}
              onClick={() => {
                setShowAdvanced((open) => !open)
              }}>
              <span>高级选项</span>
              {showAdvanced ? (
                <HiChevronUp
                  className="anime-bt-batch-panel__advanced-toggle-icon"
                  aria-hidden="true"
                  focusable="false"
                />
              ) : (
                <HiChevronDown
                  className="anime-bt-batch-panel__advanced-toggle-icon"
                  aria-hidden="true"
                  focusable="false"
                />
              )}
            </button>

            {showAdvanced ? (
              <div className="anime-bt-batch-panel__advanced-body" id={advancedOptionsId}>
                <label className="anime-bt-batch-panel__path-label" htmlFor={savePathInputId}>
                  临时下载路径
                </label>
                <div className="anime-bt-batch-panel__path-row">
                  <input
                    id={savePathInputId}
                    className="anime-bt-batch-panel__path-input"
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
                    className="anime-bt-batch-panel__button anime-bt-batch-panel__path-clear"
                    onClick={onClearSavePath}
                    disabled={disablePathActions || !savePath}>
                    清空路径
                  </button>
                </div>
                <p className="anime-bt-batch-panel__path-hint">
                  {savePathHint ||
                    "留空则使用当前下载器默认目录。远程下载器请手动输入目标主机可识别的绝对路径。"}
                </p>
              </div>
            ) : null}
          </section>
        </div>

        <div className="anime-bt-batch-panel__footer">
          <div className="anime-bt-batch-panel__selection-actions">
            <button
              type="button"
              className="anime-bt-batch-panel__button anime-bt-batch-panel__selection-button"
              onClick={onSelectAll}
              disabled={running}>
              全选本页
            </button>
            <button
              type="button"
              className="anime-bt-batch-panel__button anime-bt-batch-panel__selection-button"
              onClick={onClear}
              disabled={disableClear}>
              清空选择
            </button>
          </div>
          <button
            type="button"
            className={cn("anime-bt-batch-panel__download", running && "is-running")}
            onClick={onDownload}
            disabled={disableDownload}>
            {running ? "发送中..." : "批量下载"}
          </button>
        </div>
      </aside>
    </div>
  )
}
