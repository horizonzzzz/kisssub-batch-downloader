import speedlineBrandIcon from "../../assets/anime-bt-icon-speedline.svg"
import { ContentButton } from "../content-ui/button"

type BatchPanelLauncherProps = {
  selectedCount: number
  onExpand: () => void
}

export function BatchPanelLauncher({
  selectedCount,
  onExpand
}: BatchPanelLauncherProps) {
  return (
    <ContentButton
      type="button"
      variant="launcher"
      data-anime-bt-role="launcher-button"
      className="max-[680px]:w-full"
      aria-label="展开批量下载面板"
      onClick={onExpand}>
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
  )
}
