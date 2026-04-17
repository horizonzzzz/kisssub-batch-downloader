import { RECENT_HIT_RETENTION_CAP } from "./retention"
import { subscriptionDb } from "./db"
import type {
  NotificationRoundRow,
  SubscriptionDashboardRow,
  SubscriptionHitRow,
  SubscriptionRuntimeRow
} from "./store-types"
import { listSubscriptions } from "./catalog-repository"

export const LAST_SCHEDULER_RUN_AT_META_KEY = "lastSchedulerRunAt"

export async function buildSubscriptionDashboardRows(): Promise<SubscriptionDashboardRow[]> {
  const [subscriptions, runtimeRows, hitRows] = await Promise.all([
    listSubscriptions(),
    listSubscriptionRuntimeRows(),
    subscriptionDb.subscriptionHits.toArray()
  ])
  const runtimeBySubscriptionId = new Map(
    runtimeRows.map((row) => [row.subscriptionId, row] as const)
  )
  const hitsBySubscriptionId = groupRecentHitsBySubscriptionId(hitRows)

  return subscriptions.map((subscription) => ({
    subscription,
    runtime: runtimeBySubscriptionId.get(subscription.id) ?? null,
    recentHits: hitsBySubscriptionId.get(subscription.id) ?? []
  }))
}

export async function getLastSchedulerRunAt(): Promise<string | null> {
  const row = await subscriptionDb.subscriptionMeta.get(LAST_SCHEDULER_RUN_AT_META_KEY)
  return row?.value ?? null
}

export async function setLastSchedulerRunAt(value: string | null): Promise<void> {
  await subscriptionDb.subscriptionMeta.put({
    key: LAST_SCHEDULER_RUN_AT_META_KEY,
    value
  })
}

export async function buildSubscriptionRuntimeStatusRow() {
  const [lastSchedulerRunAt, notificationRounds, rows] = await Promise.all([
    getLastSchedulerRunAt(),
    listNotificationRounds(),
    buildSubscriptionRuntimeRows()
  ])

  return {
    lastSchedulerRunAt,
    notificationRounds,
    rows
  }
}

export async function listSubscriptionRuntimeRows(): Promise<SubscriptionRuntimeRow[]> {
  return subscriptionDb.subscriptionRuntime.toArray()
}

export async function listNotificationRounds(): Promise<NotificationRoundRow[]> {
  return subscriptionDb.notificationRounds.orderBy("createdAt").reverse().toArray()
}

export async function getNotificationRound(roundId: string): Promise<NotificationRoundRow | null> {
  const normalizedId = String(roundId ?? "").trim()
  if (!normalizedId) {
    return null
  }

  return (await subscriptionDb.notificationRounds.get(normalizedId)) ?? null
}

export async function listHitsForRound(hitIds: string[]): Promise<SubscriptionHitRow[]> {
  const normalizedHitIds = normalizeIds(hitIds)
  if (normalizedHitIds.length === 0) {
    return []
  }

  const hits = await subscriptionDb.subscriptionHits.bulkGet(normalizedHitIds)
  const hitsById = new Map(
    hits
      .filter((hit): hit is SubscriptionHitRow => hit !== undefined)
      .map((hit) => [hit.id, hit] as const)
  )

  return normalizedHitIds
    .map((hitId) => hitsById.get(hitId))
    .filter((hit): hit is SubscriptionHitRow => hit !== undefined)
}

function groupRecentHitsBySubscriptionId(
  hits: SubscriptionHitRow[]
): Map<string, SubscriptionHitRow[]> {
  const grouped = new Map<string, SubscriptionHitRow[]>()
  const sortedHits = [...hits].sort((left, right) => right.discoveredAt.localeCompare(left.discoveredAt))

  for (const hit of sortedHits) {
    const existing = grouped.get(hit.subscriptionId) ?? []
    if (existing.length >= RECENT_HIT_RETENTION_CAP) {
      continue
    }

    grouped.set(hit.subscriptionId, [...existing, hit])
  }

  return grouped
}

async function buildSubscriptionRuntimeRows() {
  const [runtimeRows, hitRows] = await Promise.all([
    listSubscriptionRuntimeRows(),
    subscriptionDb.subscriptionHits.toArray()
  ])
  const hitsBySubscriptionId = groupRecentHitsBySubscriptionId(hitRows)
  const runtimeBySubscriptionId = new Map(
    runtimeRows.map((row) => [row.subscriptionId, row] as const)
  )
  const subscriptionIds = Array.from(
    new Set([
      ...runtimeRows.map((row) => row.subscriptionId),
      ...hitRows.map((hit) => hit.subscriptionId)
    ])
  ).sort((left, right) => left.localeCompare(right))

  return subscriptionIds.map((subscriptionId) => ({
    subscriptionId,
    runtime: runtimeBySubscriptionId.get(subscriptionId) ?? null,
    recentHits: hitsBySubscriptionId.get(subscriptionId) ?? []
  }))
}

function normalizeIds(ids: string[]): string[] {
  return Array.from(
    new Set(
      ids
        .map((id) => String(id ?? "").trim())
        .filter((id) => id.length > 0)
    )
  )
}
