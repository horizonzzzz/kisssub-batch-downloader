import { subscriptionDb } from "./db"
import type { NotificationRoundRow } from "./store-types"

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

export async function clearNotificationRounds(): Promise<void> {
  await subscriptionDb.notificationRounds.clear()
}
