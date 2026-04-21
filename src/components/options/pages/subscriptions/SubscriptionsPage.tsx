import { i18n } from "../../../../lib/i18n"
import { normalizeSubscriptionPollingInterval } from "../../../../lib/subscriptions/policy/index"
import { useCallback, useEffect, useMemo, useState } from "react"

import { HiOutlineArrowPath, HiOutlinePlus, HiOutlineListBullet } from "react-icons/hi2"

import type { SubscriptionEntry } from "../../../../lib/shared/types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Alert,
  Button,
  Card
} from "../../../ui"
import { useOptionsPageFooter } from "../../layout/OptionsPageFooter"
import type { OptionsApi } from "../../OptionsPage"
import { SubscriptionCard } from "./SubscriptionCard"
import { SubscriptionCreateDialog } from "./SubscriptionCreateDialog"
import { SubscriptionsGlobalCard } from "./SubscriptionsGlobalCard"
import { SubscriptionsSummaryCard } from "./SubscriptionsSummaryCard"
import {
  duplicateSubscriptionDraft,
  type SubscriptionWorkbenchDraft
} from "./subscription-workbench"
import {
  toSubscriptionRuntimeState,
  useSubscriptionsWorkbench
} from "./use-subscriptions-workbench"
import { useSubscriptionPolicyWorkbench } from "./use-subscription-policy-workbench"

type SubscriptionsPageProps = {
  api: OptionsApi
}

export function SubscriptionsPage({ api }: SubscriptionsPageProps) {
  const {
    status,
    loading,
    mutatingSubscription,
    runtimeStatus,
    subscriptionRows,
    createSubscription,
    setSubscriptionEnabled,
    deleteSubscription,
    summary
  } = useSubscriptionsWorkbench(api)
  const {
    policy,
    setPolicy,
    status: policyStatus,
    loading: policyLoading,
    saving: policySaving,
    savePolicy
  } = useSubscriptionPolicyWorkbench(api)
  const [pollingIntervalInput, setPollingIntervalInput] = useState(
    String(policy.pollingIntervalMinutes)
  )
  const [creatingSubscription, setCreatingSubscription] = useState(false)
  const [pendingDeleteSubscriptionId, setPendingDeleteSubscriptionId] = useState<string | null>(null)
  const pendingDeleteSubscription = subscriptionRows.find(
    (row) => row.subscription.id === pendingDeleteSubscriptionId
  )?.subscription

  useEffect(() => {
    setPollingIntervalInput(String(policy.pollingIntervalMinutes))
  }, [policy.pollingIntervalMinutes])

  const handleCreateSubscription = async (nextSubscription: SubscriptionWorkbenchDraft) => {
    await createSubscription(nextSubscription)
    setCreatingSubscription(false)
  }

  const handleDuplicateSubscription = async (subscription: SubscriptionEntry) => {
    await createSubscription(duplicateSubscriptionDraft(subscription))
  }

  const handleDeleteSubscription = async (subscriptionId: string) => {
    await deleteSubscription(subscriptionId)
  }

  const handleToggleEnabled = async (subscription: SubscriptionEntry, enabled: boolean) => {
    await setSubscriptionEnabled(subscription.id, enabled)
  }

  const syncPollingIntervalInput = useCallback((value: string) => {
    const normalizedValue = normalizeSubscriptionPollingInterval(value)
    setPolicy((current) => ({
      ...current,
      pollingIntervalMinutes: normalizedValue
    }))
    setPollingIntervalInput(String(normalizedValue))

    return normalizedValue
  }, [setPolicy])
  const footerConfig = useMemo(() => {
    return {
      description: i18n.t("options.footer.currentPageDescription"),
      actions: (
        <Button
          type="button"
          size="lg"
          className="min-w-[168px] sm:min-w-[208px]"
          disabled={loading || policyLoading || policySaving}
          onClick={() => {
            const nextPolicy = {
              ...policy,
              pollingIntervalMinutes: syncPollingIntervalInput(pollingIntervalInput)
            }
            void savePolicy(nextPolicy)
          }}>
          {policySaving ? (
            <HiOutlineArrowPath className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {policySaving
            ? i18n.t("common.processing")
            : i18n.t("options.subscriptions.global.saveButton")}
        </Button>
      )
    }
  }, [
    loading,
    policy,
    policyLoading,
    policySaving,
    pollingIntervalInput,
    savePolicy,
    syncPollingIntervalInput
  ])

  useOptionsPageFooter(footerConfig)
  const visibleStatus =
    policySaving || policyStatus.tone === "error"
      ? policyStatus
      : status

  return (
    <div className="space-y-8" data-testid="subscriptions-workbench">
      <div role="status" aria-live="polite">
        <Alert tone={visibleStatus.tone} title={visibleStatus.message} />
      </div>

      <SubscriptionsSummaryCard
        subscriptionsEnabled={policy.enabled}
        configuredCount={summary.configuredCount}
        enabledCount={summary.enabledCount}
      />

      <SubscriptionsGlobalCard
        subscriptionsEnabled={policy.enabled}
        pollingIntervalMinutes={pollingIntervalInput}
        notificationsEnabled={policy.notificationsEnabled}
        configuredCount={summary.configuredCount}
        enabledCount={summary.enabledCount}
        scannedCount={summary.scannedCount}
        errorCount={summary.errorCount}
        recentHitCount={summary.recentHitCount}
        lastSchedulerRunAt={runtimeStatus.lastSchedulerRunAt}
        loading={loading || policyLoading}
        saving={policySaving}
        onSubscriptionsEnabledChange={(enabled) =>
          setPolicy((current) => ({
            ...current,
            enabled: enabled
          }))
        }
        onPollingIntervalMinutesChange={setPollingIntervalInput}
        onPollingIntervalMinutesBlur={() => {
          syncPollingIntervalInput(pollingIntervalInput)
        }}
        onNotificationsEnabledChange={(enabled) =>
          setPolicy((current) => ({
            ...current,
            notificationsEnabled: enabled
          }))
        }
      />

      <section className="space-y-4" data-testid="subscriptions-list">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">
              {i18n.t("options.subscriptions.listTitle")}
            </h3>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              {i18n.t("options.subscriptions.listDescription")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                window.location.hash = "#/subscription-hits"
              }}>
              <HiOutlineListBullet className="h-4 w-4" />
              {i18n.t("options.subscriptions.openHitsWorkbench")}
            </Button>
            <Button
              type="button"
              disabled={loading || mutatingSubscription}
              onClick={() => {
                setCreatingSubscription(true)
              }}>
              <HiOutlinePlus className="h-4 w-4" />
              {i18n.t("options.subscriptions.add")}
            </Button>
          </div>
        </div>

        {subscriptionRows.length ? (
          <div className="grid gap-4">
            {subscriptionRows.map((row) => (
              <SubscriptionCard
                key={row.subscription.id}
                subscription={row.subscription}
                runtimeState={toSubscriptionRuntimeState(row)}
                onDuplicate={() => void handleDuplicateSubscription(row.subscription)}
                onDelete={() => setPendingDeleteSubscriptionId(row.subscription.id)}
                onToggleEnabled={(enabled) => void handleToggleEnabled(row.subscription, enabled)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <div className="space-y-4 px-6 py-10 text-center">
              <h4 className="text-base font-medium text-zinc-900">
                {i18n.t("options.subscriptions.emptyTitle")}
              </h4>
              <p className="text-sm leading-6 text-zinc-500">
                {i18n.t("options.subscriptions.emptyDescription")}
              </p>
              <div className="flex justify-center">
                <Button
                  type="button"
                  disabled={loading || mutatingSubscription}
                  onClick={() => {
                    setCreatingSubscription(true)
                  }}>
                  <HiOutlinePlus className="h-4 w-4" />
                  {i18n.t("options.subscriptions.add")}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </section>

      <SubscriptionCreateDialog
        open={creatingSubscription}
        onClose={() => {
          setCreatingSubscription(false)
        }}
        onCreate={handleCreateSubscription}
        saving={mutatingSubscription}
      />

      <AlertDialog
        open={pendingDeleteSubscriptionId !== null}
        onOpenChange={(open) => {
          if (!open && !mutatingSubscription) {
            setPendingDeleteSubscriptionId(null)
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.t("options.subscriptions.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteSubscription
                ? i18n.t("options.subscriptions.deleteDescriptionNamed", [
                    pendingDeleteSubscription.name
                  ])
                : i18n.t("options.subscriptions.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutatingSubscription}>
              {i18n.t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={mutatingSubscription}
              onClick={async (event) => {
                event.preventDefault()
                if (!pendingDeleteSubscriptionId) {
                  return
                }

                try {
                  await handleDeleteSubscription(pendingDeleteSubscriptionId)
                  setPendingDeleteSubscriptionId(null)
                } catch {
                  // Keep the dialog open so the user can retry after the shared status reports the error.
                }
              }}>
              {mutatingSubscription ? i18n.t("common.processing") : i18n.t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
