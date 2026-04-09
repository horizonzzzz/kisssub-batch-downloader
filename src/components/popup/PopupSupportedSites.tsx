import { i18n } from "../../lib/i18n"
import { HiOutlineArrowTopRightOnSquare } from "react-icons/hi2"

import { POPUP_SUPPORTED_SITE_IDS, type PopupStateViewModel } from "../../lib/shared/popup"
import { getLocalizedSiteConfigMeta } from "../../lib/sources/site-meta"

type PopupSupportedSitesProps = {
  supportedSites: PopupStateViewModel["supportedSites"]
}

function toSiteHref(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url
  }
  return `https://${url}`
}

export function PopupSupportedSites({ supportedSites }: PopupSupportedSitesProps) {
  const supportedSiteLookup = new Map(supportedSites.map((site) => [site.id, site]))

  return (
    <div>
      <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
        {i18n.t("popup.supportedSites.title")}
      </h3>
      <div className="grid gap-2.5">
        {POPUP_SUPPORTED_SITE_IDS.map((sourceId) => {
          const siteMeta = getLocalizedSiteConfigMeta(sourceId)
          const siteState = supportedSiteLookup.get(sourceId)

          if (!siteState) {
            return null
          }

          return (
            <a
              key={sourceId}
              href={toSiteHref(siteMeta.url)}
              target="_blank"
              rel="noreferrer"
              aria-label={siteMeta.displayName}
              className="group flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md active:scale-[0.98]"
            >
              <div>
                <div className="font-semibold text-zinc-800 group-hover:text-zinc-900">
                  {siteMeta.navLabel}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{siteMeta.displayName}</div>
              </div>
              <div className="rounded-full bg-zinc-50 p-1.5 transition-colors group-hover:bg-zinc-100">
                <HiOutlineArrowTopRightOnSquare className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600" />
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}


