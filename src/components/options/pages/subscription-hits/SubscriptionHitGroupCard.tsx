import { i18n } from "../../../../lib/i18n"

import { Card } from "../../../ui"
import { SubscriptionHitRow } from "./SubscriptionHitRow"
import {
  countPendingHits,
  type SubscriptionHitWorkbenchViewItem,
  type SubscriptionHitsWorkbenchViewRow
} from "./subscription-hits-workbench"

type SubscriptionHitGroupCardProps = {
  row: SubscriptionHitsWorkbenchViewRow
  selectedHitIds: Set<string>
  downloading: boolean
  onToggleHitSelection: (hitId: string) => void
  onDownloadHit: (hitId: string) => void
}

function formatLatestHitTime(hits: SubscriptionHitWorkbenchViewItem[]): string {
  if (hits.length === 0) {
    return i18n.t("options.subscriptions.runtime.never")
  }

  const latest = hits[0]
  if (!latest?.discoveredAt) {
    return i18n.t("options.subscriptions.runtime.unknownTime")
  }

  const date = new Date(latest.discoveredAt)
  return date.toLocaleString()
}

function getSourceDisplayName(sourceId: string): string {
  const sourceNames: Record<string, string> = {
    acgrip: "ACG.RIP",
    bangumimoe: "Bangumi.moe",
    kisssub: "Kisssub",
    dongmanhuayuan: "Dongmanhuayuan"
  }
  return sourceNames[sourceId] ?? sourceId
}

export function SubscriptionHitGroupCard({
  row,
  selectedHitIds,
  downloading,
  onToggleHitSelection,
  onDownloadHit
}: SubscriptionHitGroupCardProps) {
  const { subscription, hits } = row
  const isDeleted = subscription.deletedAt !== null
  const statusLabel = isDeleted
    ? i18n.t("options.subscriptions.badge.deleted")
    : subscription.enabled
      ? i18n.t("options.subscriptions.badge.enabled")
      : i18n.t("options.subscriptions.badge.disabled")
  const statusClassName = isDeleted
    ? "bg-rose-100 text-rose-700"
    : subscription.enabled
      ? "bg-green-100 text-green-700"
      : "bg-zinc-100 text-zinc-500"

  const highlightedCount = hits.filter((hit) => hit.highlighted).length
  const pendingHitCount = countPendingHits(hits)

  return (
    <Card data-testid={`subscription-hit-group-${subscription.id}`}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-base font-semibold text-zinc-900 truncate">
                {subscription.name}
              </h4>
              <span
                className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${statusClassName}`}>
                {statusLabel}
              </span>
              {highlightedCount > 0 && (
                <span
                  className="inline-flex items-center rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700"
                  data-testid={`highlighted-count-${subscription.id}`}>
                  {i18n.t("options.subscriptionHits.highlightedCount", [
                    String(highlightedCount)
                  ])}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
              <span>
                {i18n.t("options.subscriptions.card.sourceScope")}:{" "}
                {subscription.sourceIds.map(getSourceDisplayName).join(", ")}
              </span>
              <span>
                {i18n.t("options.subscriptionHits.hitCount", [String(hits.length)])}
              </span>
              <span>
                {i18n.t("options.subscriptionHits.pendingHitCount", [String(pendingHitCount)])}
              </span>
              <span>
                {i18n.t("options.subscriptionHits.latestHit")}:{" "}
                {formatLatestHitTime(hits)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-200">
        <div className="divide-y divide-zinc-100">
          {hits.map((hit) => (
            <SubscriptionHitRow
              key={hit.id}
              hit={hit}
              isSelected={selectedHitIds.has(hit.id)}
              downloading={downloading}
              onToggleSelection={() => onToggleHitSelection(hit.id)}
              onDownload={() => onDownloadHit(hit.id)}
            />
          ))}
        </div>
      </div>
    </Card>
  )
}
