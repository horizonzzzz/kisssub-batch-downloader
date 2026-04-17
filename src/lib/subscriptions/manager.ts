import type { AppSettings, SubscriptionEntry } from "../shared/types"

import {
  deleteSubscription,
  listSubscriptions,
  replaceSubscriptionCatalog,
  upsertSubscription
} from "./catalog-repository"
import {
  downloadSubscriptionNotificationHits,
  type DownloadSubscriptionHitsRequest,
  type DownloadSubscriptionHitsResult,
  type SubscriptionNotificationDownloadDependencies
} from "./download-notification"
import {
  scanSubscriptions,
  type ScanSubscriptionsDependencies,
  type ScanSubscriptionsResult
} from "./scan"

export type SubscriptionManagerDownloadDependencies =
  SubscriptionNotificationDownloadDependencies
export type SubscriptionManagerDownloadResult = DownloadSubscriptionHitsResult
export type SubscriptionManagerScanResult = ScanSubscriptionsResult

export class SubscriptionManager {
  constructor(
    private readonly input: {
      appSettings: AppSettings
      now?: () => string
    }
  ) {}

  async scan(
    dependencies: Omit<
      ScanSubscriptionsDependencies,
      "appSettings" | "subscriptions" | "now"
    > = {}
  ): Promise<SubscriptionManagerScanResult> {
    const subscriptions = await listSubscriptions()

    return scanSubscriptions({
      appSettings: this.input.appSettings,
      subscriptions,
      now: this.input.now,
      ...dependencies
    })
  }

  async downloadFromNotification(
    request: DownloadSubscriptionHitsRequest,
    dependencies: SubscriptionManagerDownloadDependencies
  ): Promise<SubscriptionManagerDownloadResult> {
    return downloadSubscriptionNotificationHits(
      {
        appSettings: this.input.appSettings,
        roundId: request.roundId
      },
      {
        ...dependencies,
        now: dependencies.now ?? this.input.now
      }
    )
  }

  async replaceCatalog(nextSubscriptions: SubscriptionEntry[]): Promise<void> {
    await replaceSubscriptionCatalog(nextSubscriptions)
  }

  async upsertSubscription(subscription: SubscriptionEntry): Promise<void> {
    await upsertSubscription(subscription)
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    await deleteSubscription(subscriptionId)
  }
}

export type { DownloadSubscriptionHitsRequest, DownloadSubscriptionHitsResult }
