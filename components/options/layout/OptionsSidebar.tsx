import { Globe2 } from "lucide-react"
import { FaGithub } from "react-icons/fa"

import speedlineBrandIcon from "../../../assets/anime-bt-icon-speedline.svg"
import { SOURCE_IDS } from "../../../lib/source-config"
import { cn } from "../../../lib/utils"
import type { OptionsRouteMeta } from "../config/routes"

const BRAND_NAME = "Anime BT Batch"
const REPO_URL = "https://github.com/horizonzzzz/anime-bt-batch-downloader"

function SidebarButton({
  active,
  label,
  onClick
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200",
        active
          ? "border-azure-400/30 bg-azure-500/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          : "border-transparent bg-white/4 text-white/72 hover:border-white/8 hover:bg-white/8 hover:text-white"
      )}
      onClick={onClick}>
      <span
        aria-hidden="true"
        className={cn(
          "h-2.5 w-2.5 rounded-full transition-opacity",
          active ? "bg-azure-400 opacity-100" : "bg-white opacity-45"
        )}
      />
      <span>{label}</span>
    </button>
  )
}

type OptionsSidebarProps = {
  routes: OptionsRouteMeta[]
  activePath: string
  onNavigate: (path: string) => void
}

export function OptionsSidebar({
  routes,
  activePath,
  onNavigate
}: OptionsSidebarProps) {
  return (
    <aside className="flex flex-col gap-6 border-b border-white/6 bg-[linear-gradient(180deg,rgba(18,24,42,0.98),rgba(14,20,35,0.98)),radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_36%)] px-4 py-5 text-white md:px-5 md:py-6 xl:min-h-screen xl:w-[288px] xl:flex-none xl:border-b-0 xl:border-r xl:border-r-white/8">
      <div className="flex items-center gap-4 px-2">
        <div className="relative flex h-12 w-12 items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-azure-500/12 blur-md" aria-hidden="true" />
          <img
            src={speedlineBrandIcon}
            alt=""
            loading="eager"
            decoding="async"
            data-testid="options-brand-icon"
            className="relative block h-12 w-12"
            aria-hidden="true"
          />
        </div>
        <div>
          <div className="font-display text-lg tracking-[-0.04em] text-white">
            {BRAND_NAME}
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/45">
            Extension Settings
          </div>
        </div>
      </div>

      <div
        className="flex gap-2 overflow-auto px-1 xl:flex-1 xl:flex-col"
        data-testid="options-sidebar-groups">
        {routes.map((route) => (
          <SidebarButton
            key={route.id}
            active={route.path === activePath}
            label={route.label}
            onClick={() => onNavigate(route.path)}
          />
        ))}
      </div>

      <div className="grid gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-4 text-sm backdrop-blur-sm">
        <div className="grid gap-2">
          <div className="inline-flex items-center gap-2 text-white/55">
            <Globe2 className="h-4 w-4" aria-hidden="true" />
            <span>{SOURCE_IDS.length} 个支持源站</span>
          </div>
          <strong className="font-display text-base tracking-[-0.03em] text-white">
            qBittorrent WebUI
          </strong>
        </div>
        <a
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-4 py-3 font-medium text-white/86 transition-all duration-200 hover:-translate-y-0.5 hover:border-azure-400/35 hover:bg-white/10 hover:text-white"
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="查看 GitHub 仓库">
          <FaGithub className="h-4 w-4" aria-hidden="true" />
          <span>查看 GitHub 仓库</span>
        </a>
      </div>
    </aside>
  )
}
