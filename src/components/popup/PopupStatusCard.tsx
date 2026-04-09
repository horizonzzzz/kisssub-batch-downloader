import { i18n } from "../../lib/i18n"
import {
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineGlobeAlt
} from "react-icons/hi2"

import { getLocalizedSiteConfigMeta } from "../../lib/sources/site-meta"
import type {
  PopupActiveTabViewModel,
  PopupDownloaderConnectionStatus
} from "../../lib/shared/popup"
import type { SourceId } from "../../lib/shared/types"
import { Switch } from "../ui"

type PopupStatusCardProps = {
  downloaderConnectionStatus: PopupDownloaderConnectionStatus
  currentDownloaderName: string
  activeTab: PopupActiveTabViewModel
  onOpenGeneralOptions: () => void
  onToggleCurrentSiteEnabled: (sourceId: SourceId, enabled: boolean) => void
  actionsDisabled?: boolean
}

export function PopupStatusCard({
  downloaderConnectionStatus,
  currentDownloaderName,
  activeTab,
  onOpenGeneralOptions,
  onToggleCurrentSiteEnabled,
  actionsDisabled = false
}: PopupStatusCardProps) {
  const sourceId = activeTab.sourceId
  const isSupportedSourceTab = activeTab.supported && Boolean(sourceId)
  const isBatchRunning = activeTab.enabled && activeTab.batchRunning
  const switchDisabled = actionsDisabled || isBatchRunning

  const renderCurrentSiteSwitch = (labelClassName: string) => {
    if (!isSupportedSourceTab || !sourceId) {
      return null
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${labelClassName}`}>
            {i18n.t("popup.status.currentSiteEnabled")}
          </span>
          <Switch
            aria-label={i18n.t("popup.status.currentSiteEnabledSwitch")}
            checked={activeTab.enabled}
            disabled={switchDisabled}
            onCheckedChange={(checked) => {
              onToggleCurrentSiteEnabled(sourceId, checked)
            }}
          />
        </div>
        {isBatchRunning ? (
          <p className="text-xs leading-relaxed text-amber-900/85">
            {i18n.t("popup.status.batchRunningHint")}
          </p>
        ) : null}
      </div>
    )
  }

  if (downloaderConnectionStatus === "checking") {
    const currentSiteSwitch = renderCurrentSiteSwitch("text-sky-900")

    return (
      <div className="overflow-hidden rounded-2xl border border-sky-200 bg-sky-50 shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-2 text-sky-700 mb-2">
            <HiOutlineArrowPath className="h-5 w-5 animate-spin" />
            <h2 className="font-semibold">{i18n.t("popup.status.checking.title")}</h2>
          </div>
          <p className="text-xs text-sky-700/80 leading-relaxed">
            {i18n.t("popup.status.checking.description", [currentDownloaderName])}
          </p>
        </div>
        {currentSiteSwitch ? (
          <div className="border-t border-sky-200/60 bg-sky-100/40 px-4 py-3">{currentSiteSwitch}</div>
        ) : null}
      </div>
    )
  }

  if (downloaderConnectionStatus === "failed") {
    const currentSiteSwitch = renderCurrentSiteSwitch("text-rose-900")

    return (
      <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50 shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-2 text-rose-700 mb-2">
            <HiOutlineExclamationCircle className="h-5 w-5" />
            <h2 className="font-semibold">{i18n.t("popup.status.failed.title")}</h2>
          </div>
          <p className="text-xs text-rose-700/85 leading-relaxed mb-4">
            {i18n.t("popup.status.failed.description", [currentDownloaderName])}
          </p>
          <button
            onClick={onOpenGeneralOptions}
            disabled={actionsDisabled}
            className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-rose-700 active:bg-rose-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {i18n.t("popup.status.failed.action")}
          </button>
        </div>
        {currentSiteSwitch ? (
          <div className="border-t border-rose-200/60 bg-rose-100/40 px-4 py-3">{currentSiteSwitch}</div>
        ) : null}
      </div>
    )
  }

  if (!activeTab.supported || !activeTab.sourceId) {
    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-2 text-zinc-800 mb-2">
            <HiOutlineGlobeAlt className="h-5 w-5 text-zinc-500" />
            <h2 className="font-semibold">{i18n.t("popup.status.unsupported.title")}</h2>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {i18n.t("popup.status.unsupported.description")}
          </p>
        </div>
      </div>
    )
  }

  if (!activeTab.enabled) {
    const siteMeta = getLocalizedSiteConfigMeta(activeTab.sourceId)

    return (
      <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <HiOutlineExclamationCircle className="h-5 w-5" />
            <h2 className="font-semibold">{i18n.t("popup.status.siteDisabled.title")}</h2>
          </div>
          <p className="text-xs text-amber-700/85 leading-relaxed">
            {i18n.t("popup.status.siteDisabled.description", [siteMeta.displayName])}
          </p>
        </div>
        <div className="border-t border-amber-200/60 bg-amber-100/40 px-4 py-3">
          {renderCurrentSiteSwitch("text-amber-900")}
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm">
      <div className="p-4">
        <div className="flex items-center gap-2 text-emerald-700 mb-2">
          <HiOutlineCheckCircle className="h-5 w-5" />
          <h2 className="font-semibold">{i18n.t("popup.status.ready.title")}</h2>
        </div>
        <p className="text-xs text-emerald-700/80 leading-relaxed">
          {i18n.t("popup.status.ready.description")}
        </p>
      </div>
      <div className="border-t border-emerald-200/50 bg-emerald-100/40 px-4 py-3">
        {renderCurrentSiteSwitch("text-emerald-900")}
      </div>
    </div>
  )
}


