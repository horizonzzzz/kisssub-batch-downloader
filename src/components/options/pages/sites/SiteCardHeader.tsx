import { i18n } from "../../../../lib/i18n"
import type { JSX } from "react"

import { HiChevronDown, HiChevronUp } from "react-icons/hi2"

import type { LocalizedSiteConfigMeta } from "../../../../lib/sources/site-meta"
import type { SourceId } from "../../../../lib/shared/types"
import { cn } from "../../../../lib/shared/cn"
import { Badge, Switch } from "../../../ui"

type SiteCardHeaderProps = {
  site: LocalizedSiteConfigMeta
  siteIcon: string
  isEnabled: boolean
  isExpanded: boolean
  onToggleExpanded: (sourceId: SourceId) => void
  onToggleEnabled: (sourceId: SourceId, enabled: boolean) => void
}

export function SiteCardHeader({
  site,
  siteIcon,
  isEnabled,
  isExpanded,
  onToggleExpanded,
  onToggleEnabled
}: SiteCardHeaderProps): JSX.Element {
  return (
    <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 p-1">
          <img
            src={siteIcon}
            alt=""
            loading="eager"
            decoding="async"
            data-testid={`site-icon-${site.id}`}
            className={cn(
              "block h-full w-full rounded-full object-contain",
              isEnabled ? "" : "grayscale opacity-70"
            )}
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={cn("text-base font-semibold", isEnabled ? "text-zinc-900" : "text-zinc-500")}>
              {site.displayName}
            </h2>
            <Badge variant={isEnabled ? "brand" : "muted"}>
              {isEnabled ? site.badgeWhenEnabled : site.badgeWhenDisabled}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="inline-flex items-center gap-3 text-sm font-medium text-zinc-600">
          <span>{i18n.t("options.sites.enableLabel")}</span>
          <Switch
            checked={isEnabled}
            aria-label={`${site.navLabel} ${i18n.t("options.sites.enableSwitchSuffix")}`}
            onCheckedChange={(checked) => onToggleEnabled(site.id, Boolean(checked))}
          />
        </div>
        {isEnabled ? (
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            aria-label={`${site.navLabel} ${
              isExpanded
                ? i18n.t("options.sites.collapseConfigSuffix")
                : i18n.t("options.sites.expandConfigSuffix")
            }`}
            onClick={() => onToggleExpanded(site.id)}>
            {isExpanded ? (
              <HiChevronUp className="h-5 w-5" aria-hidden="true" />
            ) : (
              <HiChevronDown className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  )
}


