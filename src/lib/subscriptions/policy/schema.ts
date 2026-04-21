import type { SubscriptionPolicyConfig } from "./types"

export const MIN_SUBSCRIPTION_POLLING_INTERVAL_MINUTES = 5
export const MAX_SUBSCRIPTION_POLLING_INTERVAL_MINUTES = 120
export const DEFAULT_SUBSCRIPTION_POLLING_INTERVAL_MINUTES = 30

export function sanitizeSubscriptionPolicyConfig(raw: unknown): SubscriptionPolicyConfig {
  if (!raw || typeof raw !== "object") {
    return {
      enabled: false,
      pollingIntervalMinutes: DEFAULT_SUBSCRIPTION_POLLING_INTERVAL_MINUTES,
      notificationsEnabled: true
    }
  }

  const record = raw as Record<string, unknown>

  return {
    enabled: normalizeBoolean(record.enabled, false),
    pollingIntervalMinutes: normalizeSubscriptionPollingInterval(record.pollingIntervalMinutes),
    notificationsEnabled: normalizeBoolean(record.notificationsEnabled, true)
  }
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value
  }

  if (value === 1 || value === "1" || value === "true") {
    return true
  }

  if (value === 0 || value === "0" || value === "false") {
    return false
  }

  return fallback
}

export function normalizeSubscriptionPollingInterval(value: unknown): number {
  let interval: number

  if (typeof value === "number") {
    interval = Math.floor(value)
  } else if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    interval = Number.isFinite(parsed) ? parsed : DEFAULT_SUBSCRIPTION_POLLING_INTERVAL_MINUTES
  } else {
    interval = DEFAULT_SUBSCRIPTION_POLLING_INTERVAL_MINUTES
  }

  return Math.max(
    MIN_SUBSCRIPTION_POLLING_INTERVAL_MINUTES,
    Math.min(MAX_SUBSCRIPTION_POLLING_INTERVAL_MINUTES, interval)
  )
}
