import { i18n } from "../../lib/i18n"
import { HiChevronDown, HiOutlineCog6Tooth } from "react-icons/hi2"

import speedlineBrandIcon from "../../assets/anime-bt-icon-speedline.svg"
import { ContentButton } from "../content-ui/button"

type BatchPanelHeaderProps = {
  sourceName: string
  onMinimize: () => void
  onOpenSettings: () => void
}

export function BatchPanelHeader({
  sourceName,
  onMinimize,
  onOpenSettings
}: BatchPanelHeaderProps) {
  return (
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
          {i18n.t("batch.panel.title", [sourceName])}
        </strong>
      </div>

      <div className="flex gap-[6px]">
        <ContentButton
          type="button"
          variant="icon"
          data-anime-bt-role="header-settings"
          aria-label={i18n.t("batch.panel.openSettings")}
          onClick={onOpenSettings}>
          <HiOutlineCog6Tooth className="h-[16px] w-[16px]" aria-hidden="true" focusable="false" />
        </ContentButton>
        <ContentButton
          type="button"
          variant="icon"
          data-anime-bt-role="header-minimize"
          aria-label={i18n.t("batch.panel.minimize")}
          onClick={onMinimize}>
          <HiChevronDown className="h-[16px] w-[16px]" aria-hidden="true" focusable="false" />
        </ContentButton>
      </div>
    </div>
  )
}
