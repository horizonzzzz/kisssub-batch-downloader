import { i18n } from "../../../../lib/i18n"
import type {
  SubscriptionEntry,
  SubscriptionRuntimeState
} from "../../../../lib/shared/types"

import { Badge, Button, Card, Switch } from "../../../ui"
import { HiOutlineDocumentDuplicate, HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2"

import {
  getSubscriptionRuntimeSummary,
  summarizeSubscriptionConditionList,
  summarizeSubscriptionSourceIds
} from "./subscription-workbench"

type SubscriptionCardProps = {
  subscription: SubscriptionEntry
  runtimeState?: SubscriptionRuntimeState
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onToggleEnabled: (enabled: boolean) => void
}

export function SubscriptionCard({
  subscription,
  runtimeState,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleEnabled
}: SubscriptionCardProps) {
  const runtimeSummary = getSubscriptionRuntimeSummary(runtimeState)

  return (
    <Card data-testid={`subscription-card-${subscription.id}`}>
      <div className={["space-y-4 px-6 py-5", subscription.enabled ? "" : "opacity-60"].join(" ")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-zinc-900">{subscription.name}</h3>
              <Badge variant={subscription.enabled ? "success" : "muted"}>
                {subscription.enabled
                  ? i18n.t("options.subscriptions.badge.enabled")
                  : i18n.t("options.subscriptions.badge.disabled")}
              </Badge>
              <Badge variant="muted">
                {subscription.multiSiteModeEnabled
                  ? i18n.t("options.subscriptions.badge.multiSite")
                  : i18n.t("options.subscriptions.badge.singleSite")}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-zinc-500">
              {i18n.t("options.subscriptions.cardDescription")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
              <HiOutlinePencilSquare className="h-4 w-4" />
              {i18n.t("options.subscriptions.edit")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onDuplicate}>
              <HiOutlineDocumentDuplicate className="h-4 w-4" />
              {i18n.t("options.subscriptions.duplicate")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
              <HiOutlineTrash className="h-4 w-4" />
              {i18n.t("common.delete")}
            </Button>
            <Switch
              aria-label={`${subscription.name} ${i18n.t("options.subscriptions.enableSwitchSuffix")}`}
              checked={subscription.enabled}
              onCheckedChange={onToggleEnabled}
            />
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 lg:grid-cols-2">
          <FieldBlock
            label={i18n.t("options.subscriptions.card.sourceScope")}
            value={summarizeSubscriptionSourceIds(subscription.sourceIds)}
          />
          <FieldBlock
            label={i18n.t("options.subscriptions.card.titleQuery")}
            value={
              subscription.titleQuery || i18n.t("options.subscriptions.card.unsetTitleQuery")
            }
          />
          <FieldBlock
            label={i18n.t("options.subscriptions.card.subgroupQuery")}
            value={
              subscription.subgroupQuery || i18n.t("options.subscriptions.card.unsetSubgroupQuery")
            }
          />
          <FieldBlock
            label={i18n.t("options.subscriptions.card.mustConditions")}
            value={summarizeSubscriptionConditionList(subscription.advanced.must)}
          />
          <FieldBlock
            label={i18n.t("options.subscriptions.card.anyConditions")}
            value={summarizeSubscriptionConditionList(subscription.advanced.any)}
          />
          <FieldBlock
            label={i18n.t("options.subscriptions.card.lastScanAt")}
            value={runtimeSummary.lastScanAt}
          />
          <FieldBlock
            label={i18n.t("options.subscriptions.card.lastMatchedAt")}
            value={runtimeSummary.lastMatchedAt}
          />
          <FieldBlock
            className="lg:col-span-2"
            label={i18n.t("options.subscriptions.card.lastError")}
            value={runtimeSummary.lastError}
          />
          <FieldBlock
            className="lg:col-span-2"
            label={i18n.t("options.subscriptions.card.recentHits")}
            value={runtimeSummary.recentHits}
          />
        </div>
      </div>
    </Card>
  )
}

function FieldBlock({
  label,
  value,
  className = ""
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={className}>
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</div>
      <p className="mt-2 text-sm leading-6 text-zinc-700">{value}</p>
    </div>
  )
}
