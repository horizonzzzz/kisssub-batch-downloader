import { useState } from "react"
import {
  HiChevronDown,
  HiChevronUp,
  HiOutlineCog6Tooth
} from "react-icons/hi2"

import speedlineBrandIcon from "../assets/anime-bt-icon-speedline.svg"
import styles from "./batch-panel.module.scss"

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
      <div className={styles.root}>
        <div className={styles.launcher}>
          <button
            type="button"
            className={styles.launcherButton}
            aria-label="展开批量下载面板"
            onClick={() => {
              onToggleExpanded(true)
            }}>
            <span className={styles.launcherIcon}>
              <img
                src={speedlineBrandIcon}
                alt=""
                loading="eager"
                decoding="async"
                data-testid="batch-launcher-brand-icon"
                className={styles.launcherBrandIcon}
                aria-hidden="true"
              />
              {selectedCount > 0 ? (
                <span className={styles.launcherCount} aria-label={`当前已选 ${selectedCount} 项`}>
                  {selectedCount}
                </span>
              ) : null}
            </span>
            <span className={styles.launcherLabel}>批量下载</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <aside className={styles.panel} aria-label="批量下载面板">
        <div className={styles.header}>
          <div className={styles.headerCopy}>
            <div className={styles.brandLockup}>
              <span className={styles.brandBadge}>
                <img
                  src={speedlineBrandIcon}
                  alt=""
                  loading="eager"
                  decoding="async"
                  data-testid="batch-panel-brand-icon"
                  className={styles.brandIcon}
                  aria-hidden="true"
                />
              </span>
              <p className={styles.eyebrow}>Batch Downloader</p>
            </div>
            <strong>{sourceName} 批量下载</strong>
          </div>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="打开设置页"
              onClick={onOpenSettings}>
              <HiOutlineCog6Tooth
                className={styles.iconButtonIcon}
                aria-hidden="true"
                focusable="false"
              />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              aria-label="最小化批量下载面板"
              onClick={() => {
                onToggleExpanded(false)
              }}>
              <HiChevronDown
                className={styles.iconButtonIcon}
                aria-hidden="true"
                focusable="false"
              />
            </button>
          </div>
        </div>

        <div className={styles.body}>
          <section className={styles.countCard} aria-live="polite">
            <span className={styles.countValue}>{selectedCount}</span>
            <span className={styles.countLabel}>已选资源</span>
            <p className={styles.statusNote}>{statusText}</p>
          </section>

          <section
            className={
              showAdvanced ? `${styles.advanced} ${styles.isOpen}` : styles.advanced
            }>
            <button
              type="button"
              className={styles.advancedToggle}
              aria-expanded={showAdvanced}
              aria-controls={advancedOptionsId}
              onClick={() => {
                setShowAdvanced((open) => !open)
              }}>
              <span>高级选项</span>
              {showAdvanced ? (
                <HiChevronUp
                  className={styles.advancedToggleIcon}
                  aria-hidden="true"
                  focusable="false"
                />
              ) : (
                <HiChevronDown
                  className={styles.advancedToggleIcon}
                  aria-hidden="true"
                  focusable="false"
                />
              )}
            </button>

            {showAdvanced ? (
              <div className={styles.advancedBody} id={advancedOptionsId}>
                <label className={styles.pathLabel} htmlFor={savePathInputId}>
                  临时下载路径
                </label>
                <div className={styles.pathRow}>
                  <input
                    id={savePathInputId}
                    className={styles.pathInput}
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
                    className={styles.pathClear}
                    onClick={onClearSavePath}
                    disabled={disablePathActions || !savePath}>
                    清空路径
                  </button>
                </div>
                <p className={styles.pathHint}>
                  {savePathHint ||
                    "留空则使用当前下载器默认目录。远程下载器请手动输入目标主机可识别的绝对路径。"}
                </p>
              </div>
            ) : null}
          </section>
        </div>

        <div className={styles.footer}>
          <div className={styles.selectionActions}>
            <button
              type="button"
              className={styles.selectionButton}
              onClick={onSelectAll}
              disabled={running}>
              全选本页
            </button>
            <button
              type="button"
              className={styles.selectionButton}
              onClick={onClear}
              disabled={disableClear}>
              清空选择
            </button>
          </div>
          <button
            type="button"
            className={running ? `${styles.download} ${styles.isRunning}` : styles.download}
            onClick={onDownload}
            disabled={disableDownload}>
            {running ? "发送中..." : "批量下载"}
          </button>
        </div>
      </aside>
    </div>
  )
}
