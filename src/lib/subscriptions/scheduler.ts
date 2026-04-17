import { getBrowser } from "../shared/browser"
import type { AppSettings } from "../shared/types"

export const SUBSCRIPTION_ALARM_NAME = "subscription-poll"

export type SubscriptionAlarm = {
  name?: string
  periodInMinutes?: number
}

export type SubscriptionAlarmApi = {
  get: (name: string) => Promise<SubscriptionAlarm | null | undefined>
  create: (name: string, alarmInfo: { periodInMinutes: number }) => Promise<void> | void
  clear: (name: string) => Promise<boolean> | boolean
}

export async function ensureSubscriptionAlarm(
  settings: Pick<AppSettings, "subscriptionsEnabled" | "pollingIntervalMinutes">,
  alarms: SubscriptionAlarmApi = getBrowser().alarms
): Promise<void> {
  const existingAlarm = await alarms.get(SUBSCRIPTION_ALARM_NAME)

  if (!settings.subscriptionsEnabled) {
    if (existingAlarm) {
      await alarms.clear(SUBSCRIPTION_ALARM_NAME)
    }
    return
  }

  const nextPeriodInMinutes = settings.pollingIntervalMinutes
  if (existingAlarm?.periodInMinutes === nextPeriodInMinutes) {
    return
  }

  if (existingAlarm) {
    await alarms.clear(SUBSCRIPTION_ALARM_NAME)
  }

  await alarms.create(SUBSCRIPTION_ALARM_NAME, {
    periodInMinutes: nextPeriodInMinutes
  })
}
