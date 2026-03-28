import { useState } from "react"
import { HiChevronDown, HiChevronUp, HiOutlineCog6Tooth } from "react-icons/hi2"

import speedlineBrandIcon from "../assets/anime-bt-icon-speedline.svg"
import { ContentButton } from "./content-ui/button"
import { ContentInput } from "./content-ui/input"
import { cn } from "../lib/shared/cn"

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
  const advancedState = showAdvanced ? "open" : "closed"

  if (!isExpanded) {
    return (
      <div className="anime-bt-content-root fixed bottom-[20px] right-[20px] z-[2147483647] max-[680px]:bottom-[var(--anime-bt-mobile-inset)] max-[680px]:left-[var(--anime-bt-mobile-inset)] max-[680px]:right-[var(--anime-bt-mobile-inset)]">
        <div className="flex justify-end max-[680px]:justify-stretch">
          <ContentButton
            type="button"
            variant="launcher"
            data-anime-bt-role="launcher-button"
            className="max-[680px]:w-full"
            aria-label="展开批量下载面板"
            onClick={() => {
              onToggleExpanded(true)
            }}>
            <span className="relative inline-flex h-[24px] w-[24px] items-center justify-center">
              <img
                src={speedlineBrandIcon}
                alt=""
                loading="eager"
                decoding="async"
                data-testid="batch-launcher-brand-icon"
                className="block h-[18px] w-[18px] drop-shadow-[0_6px_14px_rgba(0,240,255,0.14)]"
                aria-hidden="true"
              />
              {selectedCount > 0 ? (
                <span
                  className="absolute right-[-8px] top-[-6px] h-[18px] min-w-[18px] rounded-[var(--anime-bt-radius-pill)] bg-[linear-gradient(180deg,#2a8fff_0%,#1364d9_100%)] px-[4px] text-center text-[10px] font-bold leading-[18px] text-[var(--anime-bt-white)] shadow-[0_8px_16px_rgba(19,100,217,0.4)]"
                  aria-label={`当前已选 ${selectedCount} 项`}>
                  {selectedCount}
                </span>
              ) : null}
            </span>
            <span className="tracking-[0.02em]">批量下载</span>
          </ContentButton>
        </div>
      </div>
    )
  }

  return (
    <div className="anime-bt-content-root fixed bottom-[20px] right-[20px] z-[2147483647] max-[680px]:bottom-[var(--anime-bt-mobile-inset)] max-[680px]:left-[var(--anime-bt-mobile-inset)] max-[680px]:right-[var(--anime-bt-mobile-inset)]">
      <aside
        data-anime-bt-role="panel-shell"
        className="w-[min(var(--anime-bt-panel-width),calc(100vw-24px))] overflow-hidden rounded-[var(--anime-bt-radius-xl)] border border-[rgba(135,151,173,0.24)] bg-[linear-gradient(180deg,rgba(252,253,255,0.98)_0%,rgba(243,247,252,0.98)_100%)] text-[#182636] shadow-[var(--anime-bt-shadow-floating)] backdrop-blur-[18px] max-[680px]:w-full"
        aria-label="批量下载面板">
        <div className="flex items-start justify-between gap-[12px] bg-[radial-gradient(circle_at_top_right,rgba(50,144,255,0.28),transparent_42%),linear-gradient(135deg,#0f1720_0%,#192838_55%,#25394d_100%)] px-[18px] py-[16px] text-[#f8fbff]">
          <div>
            <div className="mb-[6px] inline-flex items-center gap-[8px]">
              <span className="inline-flex h-[20px] w-[20px] items-center justify-center">
                <img
                  src={speedlineBrandIcon}
                  alt=""
                  loading="eager"
                  decoding="async"
                  data-testid="batch-panel-brand-icon"
                  className="block h-[20px] w-[20px] drop-shadow-[0_8px_16px_rgba(0,240,255,0.12)]"
                  aria-hidden="true"
                />
              </span>
              <p className="m-0 text-[10px] uppercase tracking-[0.16em] text-[rgba(219,230,244,0.72)]">
                Batch Downloader
              </p>
            </div>
            <strong className="block text-[14px] font-semibold tracking-[0.01em]">
              {sourceName} 批量下载
            </strong>
          </div>

          <div className="flex gap-[6px]">
            <ContentButton
              type="button"
              variant="icon"
              data-anime-bt-role="header-settings"
              aria-label="打开设置页"
              onClick={onOpenSettings}>
              <HiOutlineCog6Tooth className="h-[16px] w-[16px]" aria-hidden="true" focusable="false" />
            </ContentButton>
            <ContentButton
              type="button"
              variant="icon"
              data-anime-bt-role="header-minimize"
              aria-label="最小化批量下载面板"
              onClick={() => {
                onToggleExpanded(false)
              }}>
              <HiChevronDown className="h-[16px] w-[16px]" aria-hidden="true" focusable="false" />
            </ContentButton>
          </div>
        </div>

        <div className="flex flex-col gap-[var(--anime-bt-panel-gap)] p-[18px]">
          <section
            data-anime-bt-role="count-card"
            className="flex min-h-[152px] flex-col items-center justify-center rounded-[var(--anime-bt-radius-lg)] border border-[rgba(214,223,234,0.92)] bg-[linear-gradient(180deg,rgba(246,249,253,0.96),rgba(239,244,250,0.96)),linear-gradient(135deg,rgba(42,143,255,0.08),rgba(17,26,36,0))] px-[20px] py-[18px] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_12px_28px_rgba(15,23,42,0.06)]"
            aria-live="polite">
            <span className="block text-[52px] font-light leading-none text-[#142131]">{selectedCount}</span>
            <span className="mt-[6px] block text-[11px] font-bold uppercase tracking-[0.18em] text-[#687586]">
              已选资源
            </span>
            <p className="mt-[12px] text-[12px] leading-[1.55] text-[#4d5d70]">{statusText}</p>
          </section>

          <section
            data-anime-bt-role="advanced-section"
            data-state={advancedState}
            className="overflow-hidden rounded-[18px] border border-[rgba(210,220,232,0.96)] bg-[rgba(255,255,255,0.78)] data-[state=open]:shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
            <ContentButton
              type="button"
              variant="toggle"
              data-anime-bt-role="advanced-toggle"
              aria-expanded={showAdvanced}
              aria-controls={advancedOptionsId}
              onClick={() => {
                setShowAdvanced((open) => !open)
              }}>
              <span>高级选项</span>
              {showAdvanced ? (
                <HiChevronUp className="h-[14px] w-[14px] shrink-0" aria-hidden="true" focusable="false" />
              ) : (
                <HiChevronDown className="h-[14px] w-[14px] shrink-0" aria-hidden="true" focusable="false" />
              )}
            </ContentButton>

            {showAdvanced ? (
              <div className="flex flex-col gap-[8px] border-t border-[rgba(221,229,239,0.9)] p-[14px]" id={advancedOptionsId}>
                <label className="text-[12px] font-bold text-[#4e5f71]" htmlFor={savePathInputId}>
                  临时下载路径
                </label>
                <div className="flex gap-[8px] max-[680px]:flex-col">
                  <ContentInput
                    id={savePathInputId}
                    data-anime-bt-role="path-input"
                    className="flex-1 min-w-0"
                    value={savePath}
                    placeholder="留空使用默认目录"
                    onChange={(event) => {
                      onSavePathChange(event.target.value)
                    }}
                    disabled={disablePathActions}
                  />
                  <ContentButton
                    type="button"
                    variant="control"
                    data-anime-bt-role="path-clear"
                    className="shrink-0 text-[#324356]"
                    onClick={onClearSavePath}
                    disabled={disablePathActions || !savePath}>
                    清空路径
                  </ContentButton>
                </div>
                <p className="m-0 text-[12px] leading-[1.5] text-[#677586]">
                  {savePathHint ||
                    "留空则使用当前下载器默认目录。远程下载器请手动输入目标主机可识别的绝对路径。"}
                </p>
              </div>
            ) : null}
          </section>
        </div>

        <div className="flex items-center gap-[10px] border-t border-[rgba(218,227,238,0.94)] bg-[linear-gradient(180deg,rgba(246,249,252,0.98)_0%,rgba(239,244,250,0.98)_100%)] px-[18px] pb-[18px] pt-[14px] max-[680px]:flex-col max-[680px]:items-stretch">
          <div className="flex gap-[8px] max-[680px]:w-full">
            <ContentButton
              type="button"
              variant="control"
              data-anime-bt-role="select-all"
              className="max-[680px]:flex-1"
              onClick={onSelectAll}
              disabled={running}>
              全选本页
            </ContentButton>
            <ContentButton
              type="button"
              variant="control"
              data-anime-bt-role="clear-selection"
              className="max-[680px]:flex-1"
              onClick={onClear}
              disabled={disableClear}>
              清空选择
            </ContentButton>
          </div>
          <ContentButton
            type="button"
            variant="primary"
            data-anime-bt-role="footer-primary"
            data-running={running ? "true" : "false"}
            className={cn(
              "flex-1 data-[running=true]:bg-[linear-gradient(180deg,#4b97f6_0%,#2d78e8_100%)]",
              running && "data-[running=true]:shadow-[0_10px_24px_rgba(20,100,217,0.24)]"
            )}
            onClick={onDownload}
            disabled={disableDownload}>
            {running ? "发送中..." : "批量下载"}
          </ContentButton>
        </div>
      </aside>
    </div>
  )
}
