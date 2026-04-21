import { listSubscriptionsIncludingDeleted } from "./catalog-repository"
import { listSubscriptionHits } from "./hit-repository"
import { getNotificationRound } from "./notification-round-repository"
import type { SubscriptionHitStoreRow } from "./store-types"
import type { SubscriptionEntry, SourceId } from "../shared/types"

export type SubscriptionHitsWorkbenchRow = {
  subscription: SubscriptionEntry
  hits: SubscriptionHitWorkbenchItem[]
}

export type SubscriptionHitWorkbenchItem = SubscriptionHitStoreRow & {
  highlighted: boolean
}

export type SubscriptionHitsWorkbenchInput = {
  roundId: string | null
  searchText: string
  status: "all" | "pending" | "new" | "failed" | "processed"
  sourceId: SourceId | "all"
}

export async function buildSubscriptionHitsWorkbenchRows(
  input: SubscriptionHitsWorkbenchInput
): Promise<SubscriptionHitsWorkbenchRow[]> {
  const [subscriptions, hits, highlightedHitIds] = await Promise.all([
    listSubscriptionsIncludingDeleted(),
    listSubscriptionHits(),
    input.roundId ? getSubscriptionHitIdsForRound(input.roundId) : Promise.resolve([])
  ])

  return groupHitsBySubscription(subscriptions, hits, new Set(highlightedHitIds), input)
}

export async function getSubscriptionHitIdsForRound(roundId: string): Promise<string[]> {
  const round = await getNotificationRound(roundId)
  if (!round) {
    return []
  }
  return round.hits.map((hit) => hit.id)
}

function groupHitsBySubscription(
  subscriptions: SubscriptionEntry[],
  hits: SubscriptionHitStoreRow[],
  highlightedHitIds: Set<string>,
  input: SubscriptionHitsWorkbenchInput
): SubscriptionHitsWorkbenchRow[] {
  const filteredHits = hits.filter((hit) => {
    if (input.searchText && !hit.title.toLowerCase().includes(input.searchText.toLowerCase())) {
      return false
    }
    if (input.sourceId !== "all" && hit.sourceId !== input.sourceId) {
      return false
    }
    if (!matchesStatusFilter(hit.downloadStatus, hit.readAt, input.status)) {
      return false
    }
    return true
  })

  const hitsBySubscriptionId = new Map<string, SubscriptionHitWorkbenchItem[]>()
  for (const hit of filteredHits) {
    const existing = hitsBySubscriptionId.get(hit.subscriptionId) ?? []
    existing.push({ ...hit, highlighted: highlightedHitIds.has(hit.id) })
    hitsBySubscriptionId.set(hit.subscriptionId, existing)
  }

  const rows: SubscriptionHitsWorkbenchRow[] = []
  for (const subscription of subscriptions) {
    const subscriptionHits = hitsBySubscriptionId.get(subscription.id) ?? []
    if (subscriptionHits.length === 0) {
      continue
    }

    subscriptionHits.sort((a, b) => b.discoveredAt.localeCompare(a.discoveredAt))

    rows.push({
      subscription,
      hits: subscriptionHits
    })
  }

  rows.sort((a, b) => {
    const aLatest = a.hits[0]?.discoveredAt ?? ""
    const bLatest = b.hits[0]?.discoveredAt ?? ""
    return bLatest.localeCompare(aLatest)
  })

  return rows
}

function matchesStatusFilter(
  downloadStatus: SubscriptionHitStoreRow["downloadStatus"],
  readAt: SubscriptionHitStoreRow["readAt"],
  filter: SubscriptionHitsWorkbenchInput["status"]
): boolean {
  if (filter === "all") {
    return true
  }

  switch (filter) {
    case "pending":
      return downloadStatus === "idle" || downloadStatus === "failed"
    case "new":
      return downloadStatus === "idle" && readAt === null
    case "failed":
      return downloadStatus === "failed"
    case "processed":
      return downloadStatus === "submitted" || downloadStatus === "duplicate"
    default:
      return true
  }
}
