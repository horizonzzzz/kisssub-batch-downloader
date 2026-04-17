import Dexie, { type Table } from "dexie"

import type { SubscriptionEntry } from "../shared/types"
import type {
  NotificationRoundRow,
  SubscriptionHitRow,
  SubscriptionMetaRow,
  SubscriptionRuntimeRow
} from "./store-types"

export class SubscriptionDatabase extends Dexie {
  subscriptions!: Table<SubscriptionEntry, string>
  subscriptionRuntime!: Table<SubscriptionRuntimeRow, string>
  subscriptionHits!: Table<SubscriptionHitRow, string>
  notificationRounds!: Table<NotificationRoundRow, string>
  subscriptionMeta!: Table<SubscriptionMetaRow, string>

  constructor() {
    super("anime-bt-subscriptions")

    this.version(1).stores({
      subscriptions: "id, enabled, *sourceIds, createdAt",
      subscriptionRuntime: "subscriptionId, lastScanAt, lastMatchedAt",
      subscriptionHits: "id, subscriptionId, discoveredAt, downloadStatus, [subscriptionId+discoveredAt]",
      notificationRounds: "id, createdAt",
      subscriptionMeta: "key"
    })
  }
}

export const subscriptionDb = new SubscriptionDatabase()

export async function resetSubscriptionDb(): Promise<void> {
  subscriptionDb.close()
  await Dexie.delete(subscriptionDb.name)
  await subscriptionDb.open()
}
