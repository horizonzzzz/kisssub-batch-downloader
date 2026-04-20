import { i18n } from "../../../../lib/i18n"

import { Badge, Card } from "../../../ui"

type GeneralDownloaderSummaryCardProps = {
  downloaderName: string
  baseUrl: string
}

export function GeneralDownloaderSummaryCard({
  downloaderName,
  baseUrl
}: GeneralDownloaderSummaryCardProps) {
  return (
    <Card data-testid="general-downloader-summary-card">
      <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {i18n.t("options.general.summary.eyebrow")}
          </div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">
            {i18n.t("options.general.summary.title")}
          </h2>
        </div>

        <Badge variant="brand" className="w-fit">
          {downloaderName}
        </Badge>

        <dl className="grid gap-3 text-sm text-zinc-600 sm:col-span-2 sm:grid-cols-2">
          <div className="space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {i18n.t("options.general.summary.nameLabel")}
            </dt>
            <dd className="text-sm font-medium text-zinc-900">{downloaderName}</dd>
          </div>

          <div className="space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {i18n.t("options.general.summary.baseUrlLabel")}
            </dt>
            <dd className="break-all text-sm font-medium text-zinc-900">
              {baseUrl || i18n.t("common.unset")}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}
