import { subscriptionDb } from "./db"
import {
  getNotificationRound as getNotificationRoundFromRepository,
  listNotificationRounds as listNotificationRoundsFromRepository
} from "./notification-round-repository"
import type {
  SubscriptionDashboardRow,
  SubscriptionRuntimeRow
} from "./store-types"
import { listSubscriptions } from "./catalog-repository"

export const LAST_SCHEDULER_RUN_AT_META_KEY = "lastSchedulerRunAt"
export const getNotificationRound = getNotificationRoundFromRepository
export const listNotificationRounds = listNotificationRoundsFromRepository

export async function buildSubscriptionDashboardRows(): Promise<SubscriptionDashboardRow[]> {
  const [subscriptions, runtimeRows] = await Promise.all([listSubscriptions(), listSubscriptionRuntimeRows()])
  const runtimeBySubscriptionId = new Map(
    runtimeRows.map((row) => [row.subscriptionId, row] as const)
  )

  return subscriptions.map((subscription) => ({
    subscription,
    runtime: runtimeBySubscriptionId.get(subscription.id) ?? null,
    recentHits: runtimeBySubscriptionId.get(subscription.id)?.recentHits ?? []
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

async function buildSubscriptionRuntimeRows() {
  const runtimeRows = await listSubscriptionRuntimeRows()

  return [...runtimeRows]
    .sort((left, right) => left.subscriptionId.localeCompare(right.subscriptionId))
    .map((row) => ({
      subscriptionId: row.subscriptionId,
      runtime: row,
      recentHits: row.recentHits
    }))
}
