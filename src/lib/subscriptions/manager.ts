import type { SubscriptionEntry } from "../shared/types"
import type { SourceConfig } from "../sources/config/types"
import type { SubscriptionPolicyConfig } from "./policy/types"

import {
  createSubscriptionRecord,
  deleteSubscription,
  listSubscriptions,
  replaceSubscriptionCatalog,
  setSubscriptionRecordEnabled
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
      subscriptionPolicy: SubscriptionPolicyConfig
      sourceConfig: SourceConfig
      now?: () => string
    }
  ) {}

  async scan(
    dependencies: Omit<
      ScanSubscriptionsDependencies,
      "subscriptionPolicy" | "sourceConfig" | "subscriptions" | "now"
    > = {}
  ): Promise<SubscriptionManagerScanResult> {
    const subscriptions = await listSubscriptions()

    return scanSubscriptions({
      subscriptionPolicy: this.input.subscriptionPolicy,
      sourceConfig: this.input.sourceConfig,
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
        subscriptionPolicy: this.input.subscriptionPolicy,
        sourceConfig: this.input.sourceConfig,
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

  async createSubscription(subscription: SubscriptionEntry): Promise<void> {
    await createSubscriptionRecord(subscription)
  }

  async setSubscriptionEnabled(subscriptionId: string, enabled: boolean): Promise<void> {
    await setSubscriptionRecordEnabled(subscriptionId, enabled)
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    await deleteSubscription(subscriptionId)
  }
}

export type { DownloadSubscriptionHitsRequest, DownloadSubscriptionHitsResult }
