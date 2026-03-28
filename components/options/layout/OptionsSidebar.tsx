import { FaGithub } from "react-icons/fa6"
import { HiOutlineGlobeAlt } from "react-icons/hi2"

import speedlineBrandIcon from "../../../assets/anime-bt-icon-speedline.svg"
import { SOURCE_IDS } from "../../../lib/sources/catalog"
import { cn } from "../../../lib/shared/cn"
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
        "group flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
        active
          ? "bg-blue-600/10 font-medium text-blue-400"
          : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
      )}
      onClick={onClick}>
      <span
        aria-hidden="true"
        className={cn(
          "h-1.5 w-1.5 rounded-full transition-colors",
          active ? "bg-blue-400" : "bg-zinc-600 group-hover:bg-zinc-400"
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
    <aside className="flex w-full shrink-0 flex-col border-b border-zinc-800 bg-zinc-950 text-zinc-400 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:self-start lg:border-b-0 lg:border-r">
      <div className="flex h-16 items-center gap-3 border-b border-zinc-800/80 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/15 ring-1 ring-inset ring-blue-500/25">
          <img
            src={speedlineBrandIcon}
            alt=""
            loading="eager"
            decoding="async"
            data-testid="options-brand-icon"
            className="block h-6 w-6"
            aria-hidden="true"
          />
        </div>
        <div>
          <div className="font-semibold tracking-tight text-zinc-100">{BRAND_NAME}</div>
          <div className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-zinc-500">Extension Settings</div>
        </div>
      </div>

      <div
        className="flex flex-1 flex-col gap-1 overflow-auto px-3 py-6"
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

      <div className="m-3 grid gap-4 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-4 text-sm">
        <div className="grid gap-2">
          <div className="inline-flex items-center gap-2 text-zinc-500">
            <HiOutlineGlobeAlt className="h-4 w-4" aria-hidden="true" />
            <span>{SOURCE_IDS.length} 个支持源站</span>
          </div>
          <strong className="text-sm font-medium text-zinc-100">qBittorrent WebUI</strong>
        </div>
        <a
          className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-800 bg-zinc-800/80 px-4 py-2.5 font-medium text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
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
