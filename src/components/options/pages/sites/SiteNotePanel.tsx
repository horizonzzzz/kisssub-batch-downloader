import type { JSX } from "react"

import type { LocalizedSiteConfigMeta } from "../../../../lib/sources/site-meta"
import { cn } from "../../../../lib/shared/cn"

type SiteNotePanelProps = {
  site: LocalizedSiteConfigMeta
}

function getSiteNoteClassName(site: LocalizedSiteConfigMeta): string {
  if (site.noteTone === "warning") {
    return "grid gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4"
  }

  if (site.noteTone === "neutral") {
    return "grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4"
  }

  return "grid gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-4"
}

function getSiteNoteTitleClassName(site: LocalizedSiteConfigMeta): string {
  return cn(
    "text-sm font-semibold",
    site.noteTone === "warning" ? "text-amber-800" : "text-blue-800"
  )
}

export function SiteNotePanel({ site }: SiteNotePanelProps): JSX.Element | null {
  if (!site.noteDescription) {
    return null
  }

  return (
    <div className={getSiteNoteClassName(site)}>
      {site.noteTitle ? (
        <div className={getSiteNoteTitleClassName(site)}>
          {site.noteTitle}
        </div>
      ) : null}
      <div className="text-sm leading-6 text-zinc-700">{site.noteDescription}</div>
    </div>
  )
}
