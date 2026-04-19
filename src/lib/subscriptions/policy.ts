import type { SubscriptionPolicyConfig } from "./policy/types"

export function canCreateSubscriptionNotifications(
  settings: Pick<SubscriptionPolicyConfig, "enabled" | "notificationsEnabled">
): boolean {
  return settings.enabled && settings.notificationsEnabled
}

export function canDownloadSubscriptionNotifications(
  settings: Pick<
    SubscriptionPolicyConfig,
    "enabled" | "notificationsEnabled" | "notificationDownloadActionEnabled"
  >
): boolean {
  return canCreateSubscriptionNotifications(settings) && settings.notificationDownloadActionEnabled
}
