import { HiOutlineCog6Tooth } from "react-icons/hi2"

import brandIcon from "../../assets/anime-bt-icon-speedline.svg"

import type { PopupOptionsRoute, PopupStateViewModel } from "../../lib/shared/popup"
import type { SourceId } from "../../lib/shared/types"
import { PopupFooter } from "./PopupFooter"
import { PopupQuickActions } from "./PopupQuickActions"
import { PopupStatusCard } from "./PopupStatusCard"
import { PopupSupportedSites } from "./PopupSupportedSites"

export type PopupPageProps = {
  state: PopupStateViewModel
  onOpenGeneralOptions: () => void
  onOpenOptionsRoute: (route: PopupOptionsRoute) => void
  onToggleCurrentSiteEnabled: (sourceId: SourceId, enabled: boolean) => void
  actionsDisabled?: boolean
}

export function PopupPage({
  state,
  onOpenGeneralOptions,
  onOpenOptionsRoute,
  onToggleCurrentSiteEnabled,
  actionsDisabled = false
}: PopupPageProps) {
  return (
    <div className="flex h-[560px] w-[360px] flex-col bg-zinc-50 font-sans text-zinc-900 shadow-2xl">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src={brandIcon}
            alt=""
            aria-hidden="true"
            className="h-8 w-8"
            loading="eager"
            decoding="async"
          />
          <div>
            <h1 className="text-sm font-bold leading-none tracking-tight">Anime BT Batch</h1>
            <p className="text-[11px] text-zinc-500 mt-1 font-medium">一键发送至 qBittorrent</p>
          </div>
        </div>
        <button
          onClick={onOpenGeneralOptions}
          disabled={actionsDisabled}
          aria-label="打开设置"
          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <HiOutlineCog6Tooth className="h-5 w-5" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        <PopupStatusCard
          qbConfigured={state.qbConfigured}
          activeTab={state.activeTab}
          actionsDisabled={actionsDisabled}
          onOpenGeneralOptions={onOpenGeneralOptions}
          onToggleCurrentSiteEnabled={onToggleCurrentSiteEnabled}
        />

        {state.qbConfigured ? (
          <PopupQuickActions disabled={actionsDisabled} onOpenOptionsRoute={onOpenOptionsRoute} />
        ) : null}

        <PopupSupportedSites supportedSites={state.supportedSites} />
      </main>

      <PopupFooter version={state.version} helpUrl={state.helpUrl} />
    </div>
  )
}