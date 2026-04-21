import { i18n } from "../../../../lib/i18n"
import {
  buildSubscriptionDashboardRows,
  buildSubscriptionRuntimeStatusRow,
  type SubscriptionDashboardRow,
  type SubscriptionRuntimeStatusRow
} from "../../../../lib/subscriptions"
import type { SubscriptionEntry, SubscriptionRuntimeState } from "../../../../lib/shared/types"
import { useLiveQuery } from "dexie-react-hooks"
import { useEffect, useMemo, useState } from "react"

import type { OptionsApi } from "../../OptionsPage"

export type SubscriptionsWorkbenchStatus = {
  tone: "info" | "success" | "error"
  message: string
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
  const [status, setStatus] = useState<SubscriptionsWorkbenchStatus>({
    tone: "info",
    message: i18n.t("options.status.loadingSettings")
  })
  const [loading, setLoading] = useState(true)
  const [mutatingSubscription, setMutatingSubscription] = useState(false)

  const runtimeStatus =
    useLiveQuery(() => buildSubscriptionRuntimeStatusRow(), [], createInitialRuntimeStatus()) ??
    createInitialRuntimeStatus()
  const subscriptionRows =
    useLiveQuery(() => buildSubscriptionDashboardRows(), [], [] as SubscriptionDashboardRow[]) ?? []

  useEffect(() => {
    let active = true

    void api
      .getSubscriptionPolicy()
      .then(() => {
        if (!active) {
          return
        }

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
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [api])

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

  const createSubscription = async (subscription: SubscriptionEntry) => {
    await mutateSubscription(() => api.createSubscription(subscription))
  }

  const setSubscriptionEnabled = async (subscriptionId: string, enabled: boolean) => {
    await mutateSubscription(() => api.setSubscriptionEnabled(subscriptionId, enabled))
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
    status,
    loading,
    mutatingSubscription,
    runtimeStatus,
    subscriptionRows,
    createSubscription,
    setSubscriptionEnabled,
    deleteSubscription,
    summary
  }
}
