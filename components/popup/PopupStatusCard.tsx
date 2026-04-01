import {
  HiOutlineArrowPath,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineGlobeAlt
} from "react-icons/hi2"

import { POPUP_SUPPORTED_SITE_META } from "../../lib/shared/popup"
import type { PopupActiveTabViewModel, PopupQbConnectionStatus } from "../../lib/shared/popup"
import type { SourceId } from "../../lib/shared/types"
import { Switch } from "../ui"

type PopupStatusCardProps = {
  qbConnectionStatus: PopupQbConnectionStatus
  activeTab: PopupActiveTabViewModel
  onOpenGeneralOptions: () => void
  onToggleCurrentSiteEnabled: (sourceId: SourceId, enabled: boolean) => void
  actionsDisabled?: boolean
}

export function PopupStatusCard({
  qbConnectionStatus,
  activeTab,
  onOpenGeneralOptions,
  onToggleCurrentSiteEnabled,
  actionsDisabled = false
}: PopupStatusCardProps) {
  if (qbConnectionStatus === "checking") {
    return (
      <div className="overflow-hidden rounded-2xl border border-sky-200 bg-sky-50 shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-2 text-sky-700 mb-2">
            <HiOutlineArrowPath className="h-5 w-5 animate-spin" />
            <h2 className="font-semibold">正在检测 qBittorrent 连接</h2>
          </div>
          <p className="text-xs text-sky-700/80 leading-relaxed">
            正在验证当前 qBittorrent WebUI 是否可用。检测完成后，会显示可直接批量发送，或提示您前往配置页检查连接信息。
          </p>
        </div>
      </div>
    )
  }

  if (qbConnectionStatus === "failed") {
    return (
      <div className="overflow-hidden rounded-2xl border border-rose-200 bg-rose-50 shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-2 text-rose-700 mb-2">
            <HiOutlineExclamationCircle className="h-5 w-5" />
            <h2 className="font-semibold">qBittorrent 连接失败</h2>
          </div>
          <p className="text-xs text-rose-700/85 leading-relaxed mb-4">
            当前页面已就绪，但扩展暂时无法连接到 qBittorrent WebUI。请前往配置页检查地址、账号密码或 WebUI 是否已启动。
          </p>
          <button
            onClick={onOpenGeneralOptions}
            disabled={actionsDisabled}
            className="w-full rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-rose-700 active:bg-rose-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            前往配置
          </button>
        </div>
      </div>
    )
  }

  if (!activeTab.supported || !activeTab.sourceId) {
    return (
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-2 text-zinc-800 mb-2">
            <HiOutlineGlobeAlt className="h-5 w-5 text-zinc-500" />
            <h2 className="font-semibold">当前页面暂不支持批量下载</h2>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            插件在当前网站未激活。请访问下方支持的动漫资源站点，即可使用批量下载功能。
          </p>
        </div>
      </div>
    )
  }

  if (!activeTab.enabled) {
    const siteMeta = POPUP_SUPPORTED_SITE_META[activeTab.sourceId]

    return (
      <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-2 text-amber-700 mb-2">
            <HiOutlineExclamationCircle className="h-5 w-5" />
            <h2 className="font-semibold">当前站点已关闭</h2>
          </div>
          <p className="text-xs text-amber-700/85 leading-relaxed">
            {siteMeta.displayName} 已在扩展中关闭。重新开启后，页面右下角的批量下载面板和勾选框才会出现。
          </p>
        </div>
        <div className="border-t border-amber-200/60 bg-amber-100/40 px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-medium text-amber-900">在当前站点启用</span>
          <Switch
            aria-label="当前站点启用开关"
            checked={activeTab.enabled}
            disabled={actionsDisabled}
            onCheckedChange={(checked) => {
              onToggleCurrentSiteEnabled(activeTab.sourceId as SourceId, checked)
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm">
      <div className="p-4">
        <div className="flex items-center gap-2 text-emerald-700 mb-2">
          <HiOutlineCheckCircle className="h-5 w-5" />
          <h2 className="font-semibold">插件已就绪</h2>
        </div>
        <p className="text-xs text-emerald-700/80 leading-relaxed">
          当前页面受支持！您可以在页面右下角找到批量下载面板，快速勾选并发送种子。
        </p>
      </div>
      <div className="border-t border-emerald-200/50 bg-emerald-100/40 px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-emerald-900">在当前站点启用</span>
        <Switch
          aria-label="当前站点启用开关"
          checked={activeTab.enabled}
          disabled={actionsDisabled}
          onCheckedChange={(checked) => {
            onToggleCurrentSiteEnabled(activeTab.sourceId as SourceId, checked)
          }}
        />
      </div>
    </div>
  )
}
