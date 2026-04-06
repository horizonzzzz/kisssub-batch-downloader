import { HiChevronDown, HiChevronUp } from "react-icons/hi2"

import { ContentButton } from "../content-ui/button"
import { ContentInput } from "../content-ui/input"

type BatchAdvancedOptionsProps = {
  showAdvanced: boolean
  advancedState: "open" | "closed"
  advancedOptionsId: string
  savePathInputId: string
  savePath: string
  savePathHint?: string
  disablePathActions: boolean
  onToggle: () => void
  onSavePathChange: (value: string) => void
  onClearSavePath: () => void
}

export function BatchAdvancedOptions({
  showAdvanced,
  advancedState,
  advancedOptionsId,
  savePathInputId,
  savePath,
  savePathHint,
  disablePathActions,
  onToggle,
  onSavePathChange,
  onClearSavePath
}: BatchAdvancedOptionsProps) {
  return (
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
        onClick={onToggle}>
        <span>高级选项</span>
        {showAdvanced ? (
          <HiChevronUp className="h-[14px] w-[14px] shrink-0" aria-hidden="true" focusable="false" />
        ) : (
          <HiChevronDown className="h-[14px] w-[14px] shrink-0" aria-hidden="true" focusable="false" />
        )}
      </ContentButton>

      {showAdvanced ? (
        <div
          className="flex flex-col gap-[8px] border-t border-[rgba(221,229,239,0.9)] p-[14px]"
          id={advancedOptionsId}>
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
  )
}
