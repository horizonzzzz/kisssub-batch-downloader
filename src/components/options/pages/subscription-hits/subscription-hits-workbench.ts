import { i18n } from "../../../../lib/i18n"
import type {
  SubscriptionHitWorkbenchItem,
  SubscriptionHitsWorkbenchRow
} from "../../../../lib/subscriptions/hits-query"

export type SubscriptionHitDisplayStatus =
  | "new"
  | "idle"
  | "submitting"
  | "submitted"
  | "duplicate"
  | "failed"

export type SubscriptionHitWorkbenchViewItem = SubscriptionHitWorkbenchItem & {
  displayStatus: SubscriptionHitDisplayStatus
}

export type SubscriptionHitsWorkbenchViewRow = {
  subscription: SubscriptionHitsWorkbenchRow["subscription"]
  hits: SubscriptionHitWorkbenchViewItem[]
}

export function buildSubscriptionHitWorkbenchViewRows(
  rows: SubscriptionHitsWorkbenchRow[],
  submittingHitIds: ReadonlySet<string>
): SubscriptionHitsWorkbenchViewRow[] {
  return rows.map((row) => ({
    subscription: row.subscription,
    hits: row.hits.map((hit) => ({
      ...hit,
      displayStatus: getSubscriptionHitDisplayStatus(hit, submittingHitIds)
    }))
  }))
}

export function getSubscriptionHitDisplayStatus(
  hit: Pick<SubscriptionHitWorkbenchItem, "downloadStatus" | "readAt" | "id">,
  submittingHitIds: ReadonlySet<string>
): SubscriptionHitDisplayStatus {
  if (submittingHitIds.has(hit.id)) {
    return "submitting"
  }

  switch (hit.downloadStatus) {
    case "submitted":
      return "submitted"
    case "duplicate":
      return "duplicate"
    case "failed":
      return "failed"
    case "idle":
    default:
      return hit.readAt === null ? "new" : "idle"
  }
}

export function getSubscriptionHitStatusLabel(
  status: SubscriptionHitDisplayStatus
): string {
  switch (status) {
    case "new":
      return i18n.t("options.subscriptionHits.statusNew")
    case "idle":
      return i18n.t("options.subscriptionHits.statusIdle")
    case "submitting":
      return i18n.t("options.subscriptionHits.statusSubmitting")
    case "submitted":
      return i18n.t("options.subscriptionHits.statusSubmitted")
    case "duplicate":
      return i18n.t("options.subscriptionHits.statusDuplicate")
    case "failed":
      return i18n.t("options.subscriptionHits.statusFailed")
  }
}

export function getSubscriptionHitStatusBadgeClass(
  status: SubscriptionHitDisplayStatus
): string {
  switch (status) {
    case "new":
      return "bg-sky-100 text-sky-700"
    case "idle":
      return "bg-zinc-100 text-zinc-600"
    case "submitting":
      return "bg-blue-100 text-blue-700"
    case "submitted":
      return "bg-green-100 text-green-700"
    case "duplicate":
      return "bg-yellow-100 text-yellow-700"
    case "failed":
      return "bg-red-100 text-red-700"
  }
}

export function countPendingHits(
  hits: Array<Pick<SubscriptionHitWorkbenchViewItem, "displayStatus">>
): number {
  return hits.filter(
    (hit) =>
      hit.displayStatus === "new" ||
      hit.displayStatus === "idle" ||
      hit.displayStatus === "submitting" ||
      hit.displayStatus === "failed"
  ).length
}

