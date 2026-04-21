import type { SubscriptionPolicyConfig } from "./types"

export const DEFAULT_SUBSCRIPTION_POLICY_CONFIG: SubscriptionPolicyConfig = Object.freeze({
  enabled: false,
  pollingIntervalMinutes: 30,
  notificationsEnabled: true
})