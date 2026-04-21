import { subscriptionDb } from "./db"
import type { SubscriptionHitStoreRow } from "./store-types"

export function createSubscriptionHitId(subscriptionId: string, fingerprint: string): string {
  return `subscription-hit:${subscriptionId}:${encodeURIComponent(fingerprint)}`
}

export async function upsertSubscriptionHits(hits: SubscriptionHitStoreRow[]): Promise<void> {
  if (hits.length === 0) {
    return
  }

  await subscriptionDb.subscriptionHits.bulkPut(hits)
}

export async function getSubscriptionHitById(
  hitId: string
): Promise<SubscriptionHitStoreRow | null> {
  return (await subscriptionDb.subscriptionHits.get(hitId)) ?? null
}

export async function listSubscriptionHitsByIds(
  hitIds: string[]
): Promise<SubscriptionHitStoreRow[]> {
  const rows = await subscriptionDb.subscriptionHits.bulkGet(hitIds)
  return rows.filter((row): row is SubscriptionHitStoreRow => row !== undefined)
}

export async function listSubscriptionHitsBySubscriptionId(
  subscriptionId: string
): Promise<SubscriptionHitStoreRow[]> {
  const hits = await subscriptionDb.subscriptionHits
    .where("subscriptionId")
    .equals(subscriptionId)
    .sortBy("discoveredAt")
  return [...hits].reverse()
}

export async function listSubscriptionHits(): Promise<SubscriptionHitStoreRow[]> {
  return subscriptionDb.subscriptionHits.toArray()
}

export async function markSubscriptionHitsViewed(
  hitIds: string[],
  viewedAt: string
): Promise<void> {
  if (hitIds.length === 0) {
    return
  }

  const hits = await listSubscriptionHitsByIds(hitIds)
  if (hits.length === 0) {
    return
  }

  await subscriptionDb.subscriptionHits.bulkPut(
    hits.map((hit) => ({
      ...hit,
      readAt: hit.readAt ?? viewedAt
    }))
  )
}
