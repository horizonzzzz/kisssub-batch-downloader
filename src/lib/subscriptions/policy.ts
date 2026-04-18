import type { AppSettings } from "../shared/types"

export function canCreateSubscriptionNotifications(
  settings: Pick<AppSettings, "subscriptionsEnabled" | "notificationsEnabled">
): boolean {
  return settings.subscriptionsEnabled && settings.notificationsEnabled
}

export function canDownloadSubscriptionNotifications(
  settings: Pick<
    AppSettings,
    "subscriptionsEnabled" | "notificationsEnabled" | "notificationDownloadActionEnabled"
  >
): boolean {
  return canCreateSubscriptionNotifications(settings) && settings.notificationDownloadActionEnabled
}
