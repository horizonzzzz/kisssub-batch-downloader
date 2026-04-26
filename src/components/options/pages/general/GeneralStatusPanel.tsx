import { i18n } from "../../../../lib/i18n"

import { Alert } from "../../../ui"

type GeneralStatusPanelProps = {
  tone: "info" | "success" | "warning" | "error"
  title: string
  downloaderName: string
  baseUrl: string
  latestActionMessage?: string
  validatedVersionText?: string
}

export function GeneralStatusPanel({
  tone,
  title,
  downloaderName,
  baseUrl,
  latestActionMessage,
  validatedVersionText
}: GeneralStatusPanelProps) {
  return (
    <Alert
      tone={tone}
      title={title}
      data-testid="general-status-panel"
      description={
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-current/65">
              {i18n.t("options.general.summary.nameLabel")}
            </dt>
            <dd className="text-sm font-medium text-current">{downloaderName}</dd>
          </div>

          <div className="space-y-1">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-current/65">
              {i18n.t("options.general.summary.baseUrlLabel")}
            </dt>
            <dd className="break-all text-sm font-medium text-current">
              {baseUrl || i18n.t("common.unset")}
            </dd>
          </div>

          {latestActionMessage ? (
            <div className="space-y-1 sm:col-span-2">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-current/65">
                {i18n.t("options.general.statusPanel.lastActionLabel")}
              </dt>
              <dd className="text-sm text-current">{latestActionMessage}</dd>
            </div>
          ) : null}

          {validatedVersionText ? (
            <div className="sm:col-span-2 text-sm text-current">
              {validatedVersionText}
            </div>
          ) : null}
        </dl>
      }
    />
  )
}
