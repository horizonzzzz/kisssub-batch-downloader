import { i18n } from "../../../../lib/i18n"
import { HiOutlineArrowDownCircle, HiOutlineCheckCircle } from "react-icons/hi2"

import { Button } from "../../../ui"
import {
  getSubscriptionHitStatusBadgeClass,
  getSubscriptionHitStatusLabel,
  type SubscriptionHitWorkbenchViewItem
} from "./subscription-hits-workbench"

type SubscriptionHitRowProps = {
  hit: SubscriptionHitWorkbenchViewItem
  isSelected: boolean
  downloading: boolean
  onToggleSelection: () => void
  onDownload: () => void
}

function formatDiscoveryTime(discoveredAt: string): string {
  const date = new Date(discoveredAt)
  return date.toLocaleString()
}

export function SubscriptionHitRow({
  hit,
  isSelected,
  downloading,
  onToggleSelection,
  onDownload
}: SubscriptionHitRowProps) {
  const canDownload =
    hit.displayStatus === "new" ||
    hit.displayStatus === "idle" ||
    hit.displayStatus === "failed"
  const rowClass = hit.highlighted
    ? "bg-yellow-50 border-l-4 border-l-yellow-400"
    : "bg-white"

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${rowClass}`}
      data-highlighted={hit.highlighted ? "true" : "false"}
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
        className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${getSubscriptionHitStatusBadgeClass(hit.displayStatus)}`}
        data-testid={`hit-status-${hit.id}`}>
        {getSubscriptionHitStatusLabel(hit.displayStatus)}
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
