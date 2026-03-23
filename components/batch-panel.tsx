import type { BatchLogItem } from "../lib/types"

type BatchPanelProps = {
  sourceName?: string
  selectedCount: number
  running: boolean
  progressText: string
  statusText: string
  savePath: string
  savePathHint?: string
  logs: BatchLogItem[]
  onSelectAll: () => void
  onClear: () => void
  onSavePathChange: (value: string) => void
  onClearSavePath: () => void
  onDownload: () => void
  onOpenSettings: () => void
}

export function BatchPanel({
  sourceName = "当前站点",
  selectedCount,
  running,
  progressText,
  statusText,
  savePath,
  savePathHint,
  logs,
  onSelectAll,
  onClear,
  onSavePathChange,
  onClearSavePath,
  onDownload,
  onOpenSettings
}: BatchPanelProps) {
  const disableSelectionActions = running || selectedCount === 0
  const disablePathActions = running

  return (
    <aside className="kisssub-batch-panel" aria-label="批量下载面板">
      <div className="kisssub-batch-panel__header">
        <div>
          <p className="kisssub-batch-panel__eyebrow">Batch Downloader</p>
          <strong>{sourceName} 批量下载</strong>
        </div>
        <span className="kisssub-batch-panel__badge">{running ? "RUNNING" : "READY"}</span>
      </div>

      <div className="kisssub-batch-panel__stats">
        <div className="kisssub-batch-panel__stat-card">
          <span>已选项目</span>
          <strong>已选 {selectedCount} 项</strong>
        </div>
        <div className="kisssub-batch-panel__stat-card">
          <span>处理进度</span>
          <strong>{progressText}</strong>
        </div>
      </div>

      <section className="kisssub-batch-panel__status-card">
        <div className="kisssub-batch-panel__section-head">
          <strong>任务状态</strong>
          <span>{running ? "处理中" : "待命"}</span>
        </div>
        <p className="kisssub-batch-panel__status">{statusText}</p>
      </section>

      <section className="kisssub-batch-panel__path-card">
        <div className="kisssub-batch-panel__section-head">
          <strong>下载路径</strong>
          <span>{savePath ? "自定义路径" : "默认目录"}</span>
        </div>
        <label className="kisssub-batch-panel__path-label" htmlFor="kisssub-batch-save-path">
          下载路径
        </label>
        <input
          id="kisssub-batch-save-path"
          className="kisssub-batch-panel__path-input"
          type="text"
          value={savePath}
          placeholder="留空则使用当前下载器默认目录"
          onChange={(event) => {
            onSavePathChange(event.target.value)
          }}
          disabled={disablePathActions}
        />
        <div className="kisssub-batch-panel__path-actions">
          <button type="button" onClick={onClearSavePath} disabled={disablePathActions || !savePath}>
            清空路径
          </button>
        </div>
        <p className="kisssub-batch-panel__path-hint">
          {savePathHint ||
            "留空则使用当前下载器默认目录。远程下载器请手动输入目标主机可识别的绝对路径。"}
        </p>
      </section>

      <div className="kisssub-batch-panel__actions kisssub-batch-panel__actions--primary">
        <button type="button" onClick={onSelectAll} disabled={running}>
          全选本页
        </button>
        <button type="button" onClick={onClear} disabled={disableSelectionActions}>
          清空
        </button>
        <button
          type="button"
          className="primary"
          onClick={onDownload}
          disabled={disableSelectionActions}>
          批量下载
        </button>
      </div>

      <div className="kisssub-batch-panel__actions kisssub-batch-panel__actions--secondary">
        <button type="button" onClick={onOpenSettings}>
          设置
        </button>
      </div>

      <section className="kisssub-batch-panel__log-section">
        <div className="kisssub-batch-panel__section-head">
          <strong>最近结果</strong>
          <span>{logs.length ? `最新 ${logs.length} 条` : "等待任务输出"}</span>
        </div>
        {logs.length ? (
          <ul className="kisssub-batch-panel__log">
            {logs.map((log) => (
              <li
                key={`${log.detailUrl ?? log.title}-${log.status}-${log.message}`}
                className={`kisssub-batch-panel__log-item is-${log.status}`}>
                <strong>{log.title}</strong>
                <span>{log.status}</span>
                <p>{log.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="kisssub-batch-panel__empty">结果会显示在这里。</p>
        )}
      </section>
    </aside>
  )
}
