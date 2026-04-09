import { i18n } from "../../lib/i18n"
import { HiOutlineAdjustmentsHorizontal } from "react-icons/hi2"

import { ContentButton } from "../content-ui/button"
import type { BatchPanelFilterStatus } from "./types"

type BatchFilterStatusCardProps = {
  filterStatus: BatchPanelFilterStatus
  onOpenSettings: () => void
}

export function BatchFilterStatusCard({
  filterStatus,
  onOpenSettings
}: BatchFilterStatusCardProps) {
  const hasFilters = filterStatus.filters.length > 0

  return (
    <section
      data-anime-bt-role="filter-status-card"
      className="rounded-[var(--anime-bt-radius-lg)] border border-[rgba(214,223,234,0.92)] bg-[rgba(248,250,252,0.92)] px-[16px] py-[14px] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]"
      aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#687586]">
            {i18n.t("batch.filter.title")}
          </p>
          <p className="text-[13px] font-medium leading-[1.5] text-[#182636]">
            {filterStatus.summaryText}
          </p>
        </div>
        {hasFilters ? (
          <ContentButton
            type="button"
            variant="icon"
            className="h-[28px] w-[28px] border border-[rgba(188,200,214,0.92)] bg-white/90 text-[#526375] hover:enabled:border-[rgba(121,139,160,0.86)] hover:enabled:bg-white hover:enabled:text-[#182636]"
            onClick={onOpenSettings}
            aria-label={i18n.t("batch.filter.openSettings")}
            title={i18n.t("batch.filter.openSettings")}>
            <HiOutlineAdjustmentsHorizontal
              className="h-[15px] w-[15px]"
              aria-hidden="true"
              focusable="false"
            />
          </ContentButton>
        ) : null}
      </div>

      {filterStatus.emptyStateText ? (
        <p className="mt-2 text-[12px] leading-[1.6] text-[#607184]">{filterStatus.emptyStateText}</p>
      ) : null}
    </section>
  )
}
