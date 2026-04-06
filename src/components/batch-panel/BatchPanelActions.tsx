import { cn } from "../../lib/shared/cn"
import { ContentButton } from "../content-ui/button"

type BatchPanelActionsProps = {
  running: boolean
  disableSelectAll: boolean
  disableClear: boolean
  disableDownload: boolean
  downloadLabel: string
  onSelectAll: () => void
  onClear: () => void
  onDownload: () => void
}

export function BatchPanelActions({
  running,
  disableSelectAll,
  disableClear,
  disableDownload,
  downloadLabel,
  onSelectAll,
  onClear,
  onDownload
}: BatchPanelActionsProps) {
  return (
    <div className="flex items-center gap-[10px] border-t border-[rgba(218,227,238,0.94)] bg-[linear-gradient(180deg,rgba(246,249,252,0.98)_0%,rgba(239,244,250,0.98)_100%)] px-[18px] pb-[18px] pt-[14px] max-[680px]:flex-col max-[680px]:items-stretch">
      <div className="flex gap-[8px] max-[680px]:w-full">
        <ContentButton
          type="button"
          variant="control"
          data-anime-bt-role="select-all"
          className="max-[680px]:flex-1"
          onClick={onSelectAll}
          disabled={disableSelectAll}>
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
        {downloadLabel}
      </ContentButton>
    </div>
  )
}
