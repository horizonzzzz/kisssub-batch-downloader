import { i18n } from "../../../../lib/i18n"
import { HiOutlineArrowTopRightOnSquare } from "react-icons/hi2"

import { SOURCE_IDS } from "../../../../lib/sources/catalog"
import { getLocalizedSiteConfigMeta } from "../../../../lib/sources/site-meta"
import { Button, Card } from "../../../ui"

const accentClassNames: Record<"default" | "emerald" | "cyan", string> = {
  default: "bg-blue-500",
  emerald: "bg-emerald-500",
  cyan: "bg-cyan-500"
}

const overviewCapabilityKeys = [
  "siteSettings",
  "disabledSourceGuards",
  "standaloneOverview"
] as const

export function OverviewPage() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-3">
        {SOURCE_IDS.map((sourceId) => {
          const site = getLocalizedSiteConfigMeta(sourceId)

          return (
            <Card key={site.id} className="overflow-hidden">
              <div className="grid gap-4 px-6 py-6">
                <div className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500">
                  <span className={`h-2.5 w-2.5 rounded-full ${accentClassNames[site.overviewAccent]}`} />
                  <span>{i18n.t("options.overview.supportHealthy")}</span>
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-medium text-zinc-900">
                    {site.displayName}
                  </h2>
                  <p className="text-sm leading-6 text-zinc-500">{site.summary}</p>
                </div>
                <div className="border-t border-zinc-100 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://${site.url}`, "_blank")}>
                    <span>{i18n.t("options.overview.visitSite")}</span>
                    <HiOutlineArrowTopRightOnSquare className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="border-zinc-900 bg-zinc-900 text-white">
        <div className="grid gap-4 px-6 py-6">
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-white">{i18n.t("options.overview.capabilitiesTitle")}</h2>
          </div>
          <ul className="grid gap-3 pl-5 text-sm leading-6 text-white/76">
            {overviewCapabilityKeys.map((capabilityKey) => (
              <li key={capabilityKey}>{i18n.t(`options.overview.capabilities.${capabilityKey}`)}</li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  )
}
