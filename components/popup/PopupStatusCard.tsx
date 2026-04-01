import {
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineGlobeAlt
} from "react-icons/hi2"

import { POPUP_SUPPORTED_SITE_META } from "../../lib/shared/popup"
import type { PopupActiveTabViewModel } from "../../lib/shared/popup"
import type { SourceId } from "../../lib/shared/types"
import { Switch } from "../ui"

type PopupStatusCardProps = {
  qbConfigured: boolean
  activeTab: PopupActiveTabViewModel
  onOpenGeneralOptions: () => void
  onToggleCurrentSiteEnabled: (sourceId: SourceId, enabled: boolean) => void
  actionsDisabled?: boolean
}

export function PopupStatusCard({
  qbConfigured,
  activeTab,
  onOpenGeneralOptions,
  onToggleCurrentSiteEnabled,
  actionsDisabled = false
}: PopupStatusCardProps) {
  if (!qbConfigured) {
    return (
      <div className="overflow-hidden rounded-2xl border border-orange-200 bg-orange-50 shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-2 text-orange-700 mb-2">
            <HiOutlineExclamationCircle className="h-5 w-5" />
            <h2 className="font-semibold">未配置 qBittorrent</h2>
          </div>
          <p className="text-xs text-orange-700/80 leading-relaxed mb-4">
            为了实现一键批量发送种子，请先配置您的 qBittorrent WebUI 连接信息。
          </p>
          <button
            onClick={onOpenGeneralOptions}
            disabled={actionsDisabled}
            className="w-full rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-orange-700 active:bg-orange-800 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            立即配置
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