import { getDownloaderConfig } from "../../downloader/config/storage"
import { getDownloaderMeta } from "../../downloader"
import { getSubscriptionPolicyConfig } from "../../subscriptions/policy/storage"
import { subscriptionDb } from "../../subscriptions/db"

export type OverviewState = {
  downloaderName: string
  downloaderBaseUrl: string
  subscriptionsEnabled: boolean
  configuredSubscriptionCount: number
  enabledSubscriptionCount: number
}

export async function getOverviewState(): Promise<OverviewState> {
  const downloaderConfig = await getDownloaderConfig()
  const subscriptionPolicy = await getSubscriptionPolicyConfig()
  const meta = getDownloaderMeta(downloaderConfig.activeId)
  const activeProfile = downloaderConfig.profiles[downloaderConfig.activeId]

  // Count subscriptions from Dexie database
  const configuredCount = await subscriptionDb.subscriptions.count()
  const enabledCount = await subscriptionDb.subscriptions.where("enabled").equals(1).count()

  return {
    downloaderName: meta.displayName,
    downloaderBaseUrl: activeProfile.baseUrl,
    subscriptionsEnabled: subscriptionPolicy.enabled,
    configuredSubscriptionCount: configuredCount,
    enabledSubscriptionCount: enabledCount
  }
}