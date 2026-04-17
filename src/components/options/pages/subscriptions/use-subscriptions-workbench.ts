import { i18n } from "../../../../lib/i18n"
import { DEFAULT_SETTINGS } from "../../../../lib/settings"
import {
  buildSubscriptionDashboardRows,
  buildSubscriptionRuntimeStatusRow,
  type SubscriptionDashboardRow,
  type SubscriptionRuntimeStatusRow
} from "../../../../lib/subscriptions"
import type { AppSettings, SubscriptionEntry, SubscriptionRuntimeState } from "../../../../lib/shared/types"
import { useLiveQuery } from "dexie-react-hooks"
import { useEffect, useMemo, useState } from "react"

import type { OptionsApi } from "../../OptionsPage"

type SubscriptionSettingsSlice = Pick<
  AppSettings,
  | "subscriptionsEnabled"
  | "pollingIntervalMinutes"
  | "notificationsEnabled"
  | "notificationDownloadActionEnabled"
>

export type SubscriptionsWorkbenchStatus = {
  tone: "info" | "success" | "error"
  message: string
}

const DEFAULT_SUBSCRIPTION_SETTINGS: SubscriptionSettingsSlice = {
  subscriptionsEnabled: DEFAULT_SETTINGS.subscriptionsEnabled,
  pollingIntervalMinutes: DEFAULT_SETTINGS.pollingIntervalMinutes,
  notificationsEnabled: DEFAULT_SETTINGS.notificationsEnabled,
  notificationDownloadActionEnabled: DEFAULT_SETTINGS.notificationDownloadActionEnabled
}

function pickSubscriptionSettings(settings: SubscriptionSettingsSlice): SubscriptionSettingsSlice {
  return {
    subscriptionsEnabled: settings.subscriptionsEnabled,
    pollingIntervalMinutes: settings.pollingIntervalMinutes,
    notificationsEnabled: settings.notificationsEnabled,
    notificationDownloadActionEnabled: settings.notificationDownloadActionEnabled
  }
}

function createInitialRuntimeStatus(): SubscriptionRuntimeStatusRow {
  return {
    lastSchedulerRunAt: null,
    notificationRounds: [],
    rows: []
  }
}

export function toSubscriptionRuntimeState(
  row: SubscriptionDashboardRow
): SubscriptionRuntimeState {
  return {
    lastScanAt: row.runtime?.lastScanAt ?? null,
    lastMatchedAt: row.runtime?.lastMatchedAt ?? null,
    lastError: row.runtime?.lastError ?? "",
    seenFingerprints: row.runtime?.seenFingerprints ?? [],
    recentHits: row.recentHits
  }
}

export function useSubscriptionsWorkbench(api: OptionsApi) {
  const [settings, setSettings] = useState<SubscriptionSettingsSlice>(DEFAULT_SUBSCRIPTION_SETTINGS)
  const [status, setStatus] = useState<SubscriptionsWorkbenchStatus>({
    tone: "info",
    message: i18n.t("options.status.loadingSettings")
  })
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [settingsReady, setSettingsReady] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [mutatingSubscription, setMutatingSubscription] = useState(false)

  const runtimeStatus =
    useLiveQuery(() => buildSubscriptionRuntimeStatusRow(), [], createInitialRuntimeStatus()) ??
    createInitialRuntimeStatus()
  const subscriptionRows =
    useLiveQuery(() => buildSubscriptionDashboardRows(), [], [] as SubscriptionDashboardRow[]) ?? []

  useEffect(() => {
    let active = true

    void api
      .loadAppSettings()
      .then((loaded) => {
        if (!active) {
          return
        }

        setSettings(pickSubscriptionSettings(loaded))
        setSettingsReady(true)
        setStatus({
          tone: "success",
          message: i18n.t("options.status.settingsLoaded")
        })
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setStatus({
          tone: "error",
          message: error instanceof Error ? error.message : i18n.t("options.status.loadFailed")
        })
      })
      .finally(() => {
        if (active) {
          setLoadingSettings(false)
        }
      })

    return () => {
      active = false
    }
  }, [api])

  const saveGlobalSettings = async () => {
    if (!settingsReady) {
      return
    }

    setSavingSettings(true)
    setStatus({
      tone: "info",
      message: i18n.t("options.status.savingSettings")
    })

    try {
      const saved = await api.saveAppSettings(settings)
      setSettings(pickSubscriptionSettings(saved))
      setStatus({
        tone: "success",
        message: i18n.t("options.status.settingsSaved")
      })
    } catch (error: unknown) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : i18n.t("options.status.saveFailed")
      })
    } finally {
      setSavingSettings(false)
    }
  }

  const mutateSubscription = async (
    run: () => Promise<void>,
    savingMessage = i18n.t("options.status.savingSettings")
  ) => {
    setMutatingSubscription(true)
    setStatus({
      tone: "info",
      message: savingMessage
    })

    try {
      await run()
      setStatus({
        tone: "success",
        message: i18n.t("options.status.settingsSaved")
      })
    } catch (error: unknown) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : i18n.t("options.status.saveFailed")
      })
      throw error
    } finally {
      setMutatingSubscription(false)
    }
  }

  const upsertSubscription = async (subscription: SubscriptionEntry) => {
    await mutateSubscription(() => api.upsertSubscription(subscription))
  }

  const deleteSubscription = async (subscriptionId: string) => {
    await mutateSubscription(() => api.deleteSubscription(subscriptionId))
  }

  const summary = useMemo(
    () => ({
      configuredCount: subscriptionRows.length,
      enabledCount: subscriptionRows.filter((row) => row.subscription.enabled).length,
      scannedCount: subscriptionRows.filter((row) => Boolean(row.runtime?.lastScanAt)).length,
      errorCount: subscriptionRows.filter((row) => Boolean(row.runtime?.lastError.trim())).length,
      recentHitCount: subscriptionRows.reduce((count, row) => count + row.recentHits.length, 0)
    }),
    [subscriptionRows]
  )

  return {
    settings,
    setSettings,
    status,
    loadingSettings,
    settingsReady,
    savingSettings,
    mutatingSubscription,
    runtimeStatus,
    subscriptionRows,
    saveGlobalSettings,
    upsertSubscription,
    deleteSubscription,
    summary
  }
}
