import { i18n } from "../../../../lib/i18n"
import {
  MAX_SUBSCRIPTION_POLLING_INTERVAL_MINUTES,
  MIN_SUBSCRIPTION_POLLING_INTERVAL_MINUTES
} from "../../../../lib/subscriptions/policy/index"

import { Badge, Card, Input, Label, Switch } from "../../../ui"
import {
  formatSubscriptionDateTime
} from "./subscription-workbench"

type SubscriptionsGlobalCardProps = {
  subscriptionsEnabled: boolean
  pollingIntervalMinutes: string
  notificationsEnabled: boolean
  configuredCount: number
  enabledCount: number
  scannedCount: number
  errorCount: number
  recentHitCount: number
  lastSchedulerRunAt: string | null
  loading?: boolean
  saving?: boolean
  onSubscriptionsEnabledChange: (enabled: boolean) => void
  onPollingIntervalMinutesChange: (minutes: string) => void
  onPollingIntervalMinutesBlur: () => void
  onNotificationsEnabledChange: (enabled: boolean) => void
}

export function SubscriptionsGlobalCard({
  subscriptionsEnabled,
  pollingIntervalMinutes,
  notificationsEnabled,
  configuredCount,
  enabledCount,
  scannedCount,
  errorCount,
  recentHitCount,
  lastSchedulerRunAt,
  loading = false,
  saving = false,
  onSubscriptionsEnabledChange,
  onPollingIntervalMinutesChange,
  onPollingIntervalMinutesBlur,
  onNotificationsEnabledChange
}: SubscriptionsGlobalCardProps) {
  const controlsDisabled = loading || saving

  return (
    <Card>
      <div className="space-y-6 px-6 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {i18n.t("options.subscriptions.title")}
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-zinc-500">
              {i18n.t("options.subscriptions.description")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="brand">
              {i18n.t("options.subscriptions.configuredCount", [configuredCount])}
            </Badge>
            <Badge variant="success">
              {i18n.t("options.subscriptions.enabledCount", [enabledCount])}
            </Badge>
            <Badge variant="muted">
              {i18n.t("options.subscriptions.scannedCount", [scannedCount])}
            </Badge>
            <Badge variant={errorCount ? "warning" : "muted"}>
              {i18n.t("options.subscriptions.errorCount", [errorCount])}
            </Badge>
            <Badge variant="muted">
              {i18n.t("options.subscriptions.recentHitCount", [recentHitCount])}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.9fr)]">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingSwitchRow
              title={i18n.t("options.subscriptions.global.enabledTitle")}
              description={i18n.t("options.subscriptions.global.enabledDescription")}
              checked={subscriptionsEnabled}
              disabled={controlsDisabled}
              onCheckedChange={onSubscriptionsEnabledChange}
            />

            <div className="rounded-xl border border-zinc-200 p-4">
              <Label htmlFor="subscription-polling-interval">
                {i18n.t("options.subscriptions.global.pollingIntervalLabel")}
              </Label>
              <Input
                id="subscription-polling-interval"
                className="mt-3"
                type="number"
                min={MIN_SUBSCRIPTION_POLLING_INTERVAL_MINUTES}
                max={MAX_SUBSCRIPTION_POLLING_INTERVAL_MINUTES}
                step={5}
                value={pollingIntervalMinutes}
                disabled={controlsDisabled}
                onBlur={onPollingIntervalMinutesBlur}
                onChange={(event) => onPollingIntervalMinutesChange(event.target.value)}
              />
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                {i18n.t("options.subscriptions.global.pollingIntervalHint")}
              </p>
            </div>

            <SettingSwitchRow
              title={i18n.t("options.subscriptions.global.notificationsEnabledTitle")}
              description={i18n.t("options.subscriptions.global.notificationsEnabledDescription")}
              checked={notificationsEnabled}
              disabled={controlsDisabled}
              onCheckedChange={onNotificationsEnabledChange}
            />
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <h3 className="text-sm font-semibold text-zinc-900">
              {i18n.t("options.subscriptions.global.runtimeTitle")}
            </h3>

            <dl className="mt-4 space-y-4 text-sm">
              <StatusRow
                label={i18n.t("options.subscriptions.global.lastSchedulerRunAt")}
                value={formatSubscriptionDateTime(lastSchedulerRunAt)}
              />
              <StatusRow
                label={i18n.t("options.subscriptions.global.supportedSourcesLabel")}
                value={i18n.t("options.subscriptions.global.supportedSourcesValue")}
              />
            </dl>
          </div>
        </div>
      </div>
    </Card>
  )
}

type SettingSwitchRowProps = {
  title: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}

function SettingSwitchRow({
  title,
  description,
  checked,
  disabled = false,
  onCheckedChange
}: SettingSwitchRowProps) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-zinc-200 p-4 transition-colors hover:bg-zinc-50">
      <div className="space-y-1">
        <div className="text-sm font-medium text-zinc-900">{title}</div>
        <div className="text-xs leading-5 text-zinc-500">{description}</div>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        aria-label={title}
        onCheckedChange={onCheckedChange}
      />
    </label>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-3">
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-700">{value}</dd>
    </div>
  )
}
