import type { SubscriptionPolicyConfig } from "./types"

const MIN_POLLING_INTERVAL = 5
const MAX_POLLING_INTERVAL = 120

export function sanitizeSubscriptionPolicyConfig(raw: unknown): SubscriptionPolicyConfig {
  if (!raw || typeof raw !== "object") {
    return {
      enabled: false,
      pollingIntervalMinutes: 30,
      notificationsEnabled: true,
      notificationDownloadActionEnabled: true
    }
  }

  const record = raw as Record<string, unknown>

  return {
    enabled: normalizeBoolean(record.enabled, false),
    pollingIntervalMinutes: normalizePollingInterval(record.pollingIntervalMinutes),
    notificationsEnabled: normalizeBoolean(record.notificationsEnabled, true),
    notificationDownloadActionEnabled: normalizeBoolean(record.notificationDownloadActionEnabled, true)
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

function normalizePollingInterval(value: unknown): number {
  let interval: number

  if (typeof value === "number") {
    interval = Math.floor(value)
  } else if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10)
    interval = Number.isFinite(parsed) ? parsed : 30
  } else {
    interval = 30
  }

  return Math.max(MIN_POLLING_INTERVAL, Math.min(MAX_POLLING_INTERVAL, interval))
}