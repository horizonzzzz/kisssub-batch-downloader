import type { SubscriptionEntry, SubscriptionHitRecord } from "../shared/types"

export type SubscriptionRuntimeRow = {
  subscriptionId: string
  lastScanAt: string | null
  lastMatchedAt: string | null
  lastError: string
  seenFingerprints: string[]
}

export type SubscriptionHitRow = SubscriptionHitRecord

export type NotificationRoundRow = {
  id: string
  createdAt: string
  hitIds: string[]
}

export type SubscriptionMetaRow = {
  key: string
  value: string | null
}

export type SubscriptionDashboardRow = {
  subscription: SubscriptionEntry
  runtime: SubscriptionRuntimeRow | null
  recentHits: SubscriptionHitRow[]
}

export type SubscriptionRuntimeStatusEntry = {
  subscriptionId: string
  runtime: SubscriptionRuntimeRow | null
  recentHits: SubscriptionHitRow[]
}

export type SubscriptionRuntimeStatusRow = {
  lastSchedulerRunAt: string | null
  notificationRounds: NotificationRoundRow[]
  rows: SubscriptionRuntimeStatusEntry[]
}
