import { i18n } from "../../../../lib/i18n"

import { Badge, Card } from "../../../ui"

type SubscriptionsSummaryCardProps = {
  subscriptionsEnabled: boolean
  configuredCount: number
  enabledCount: number
}

export function SubscriptionsSummaryCard({
  subscriptionsEnabled,
  configuredCount,
  enabledCount
}: SubscriptionsSummaryCardProps) {
  return (
    <Card data-testid="subscriptions-summary-card">
      <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="space-y-1">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {i18n.t("options.subscriptions.summaryEyebrow")}
          </div>
          <h2 className="text-base font-semibold tracking-tight text-zinc-900">
            {i18n.t("options.subscriptions.summaryTitle")}
          </h2>
        </div>

        <Badge variant={subscriptionsEnabled ? "success" : "muted"} className="w-fit">
          {subscriptionsEnabled
            ? i18n.t("options.subscriptions.badge.enabled")
            : i18n.t("options.subscriptions.badge.disabled")}
        </Badge>

        <dl className="grid gap-3 text-sm text-zinc-600 sm:col-span-2 sm:grid-cols-3">
          <div className="space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {i18n.t("options.subscriptions.summaryPollingLabel")}
            </dt>
            <dd className="text-sm font-medium text-zinc-900">
              {subscriptionsEnabled
                ? i18n.t("options.subscriptions.badge.enabled")
                : i18n.t("options.subscriptions.badge.disabled")}
            </dd>
          </div>

          <div className="space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {i18n.t("options.subscriptions.summaryConfiguredLabel")}
            </dt>
            <dd className="text-sm font-medium text-zinc-900">
              {i18n.t("options.subscriptions.configuredCount", [configuredCount])}
            </dd>
          </div>

          <div className="space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
              {i18n.t("options.subscriptions.summaryEnabledLabel")}
            </dt>
            <dd className="text-sm font-medium text-zinc-900">
              {i18n.t("options.subscriptions.enabledCount", [enabledCount])}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}
