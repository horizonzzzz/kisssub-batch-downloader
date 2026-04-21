import { i18n } from "../../../../lib/i18n"
import type { SubscriptionHitWorkbenchItem } from "../../../../lib/subscriptions/hits-query"
import { HiOutlineArrowDownCircle, HiOutlineCheckCircle } from "react-icons/hi2"

import { Button, Input } from "../../../ui"

type SubscriptionHitRowProps = {
  hit: SubscriptionHitWorkbenchItem
  isSelected: boolean
  downloading: boolean
  onToggleSelection: () => void
  onDownload: () => void
}

function formatDiscoveryTime(discoveredAt: string): string {
  const date = new Date(discoveredAt)
  return date.toLocaleString()
}

function getStatusLabel(status: SubscriptionHitWorkbenchItem["downloadStatus"]): string {
  switch (status) {
    case "idle":
      return i18n.t("options.subscriptionHits.statusIdle")
    case "submitted":
      return i18n.t("options.subscriptionHits.statusSubmitted")
    case "duplicate":
      return i18n.t("options.subscriptionHits.statusDuplicate")
    case "failed":
      return i18n.t("options.subscriptionHits.statusFailed")
    default:
      return status
  }
}

function getStatusBadgeClass(status: SubscriptionHitWorkbenchItem["downloadStatus"]): string {
  switch (status) {
    case "idle":
      return "bg-zinc-100 text-zinc-600"
    case "submitted":
      return "bg-green-100 text-green-700"
    case "duplicate":
      return "bg-yellow-100 text-yellow-700"
    case "failed":
      return "bg-red-100 text-red-700"
    default:
      return "bg-zinc-100 text-zinc-600"
  }
}

export function SubscriptionHitRow({
  hit,
  isSelected,
  downloading,
  onToggleSelection,
  onDownload
}: SubscriptionHitRowProps) {
  const canDownload = hit.downloadStatus === "idle" || hit.downloadStatus === "failed"
  const rowClass = hit.highlighted
    ? "bg-yellow-50 border-l-4 border-l-yellow-400"
    : "bg-white"

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${rowClass}`}
      data-testid={`subscription-hit-row-${hit.id}`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelection}
        className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-2 focus:ring-blue-500"
        aria-label={i18n.t("options.subscriptionHits.selectHitAriaLabel", [hit.title])}
      />

      <div className="min-w-0 flex-1">
        <a
          href={hit.detailUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm font-medium text-zinc-900 hover:text-zinc-600 hover:underline"
          title={hit.title}>
          {hit.title}
        </a>
        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
          {hit.subgroup && (
            <span className="truncate max-w-[120px]" title={hit.subgroup}>
              {hit.subgroup}
            </span>
          )}
          <span className="text-zinc-300">|</span>
          <span>{hit.sourceId}</span>
          <span className="text-zinc-300">|</span>
          <span>{formatDiscoveryTime(hit.discoveredAt)}</span>
        </div>
      </div>

      <span
        className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${getStatusBadgeClass(hit.downloadStatus)}`}
        data-testid={`hit-status-${hit.id}`}>
        {getStatusLabel(hit.downloadStatus)}
      </span>

      {canDownload && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={downloading}
          onClick={onDownload}
          aria-label={i18n.t("options.subscriptionHits.downloadHitAriaLabel", [hit.title])}>
          {downloading ? (
            <HiOutlineArrowDownCircle className="h-4 w-4 animate-spin" />
          ) : (
            <HiOutlineCheckCircle className="h-4 w-4" />
          )}
          {i18n.t("options.subscriptionHits.download")}
        </Button>
      )}
    </div>
  )
}