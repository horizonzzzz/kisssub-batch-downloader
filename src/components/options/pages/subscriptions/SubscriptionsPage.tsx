import { i18n } from "../../../../lib/i18n"
import { useMemo, useState } from "react"

import { HiOutlinePlus } from "react-icons/hi2"

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
import type { OptionsApi } from "../../OptionsPage"
import { SubscriptionCard } from "./SubscriptionCard"
import { SubscriptionEditorDialog } from "./SubscriptionEditorDialog"
import { SubscriptionsGlobalCard } from "./SubscriptionsGlobalCard"
import {
  createSubscriptionDraft,
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
    upsertSubscription,
    deleteSubscription,
    summary
  } = useSubscriptionsWorkbench(api)
  const {
    policy,
    setPolicy,
    loading: policyLoading,
    saving: policySaving,
    savePolicy
  } = useSubscriptionPolicyWorkbench(api)
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null)
  const [creatingSubscription, setCreatingSubscription] = useState(false)
  const [pendingDeleteSubscriptionId, setPendingDeleteSubscriptionId] = useState<string | null>(null)
  const pendingDeleteSubscription = subscriptionRows.find(
    (row) => row.subscription.id === pendingDeleteSubscriptionId
  )?.subscription

  const initialSubscription = useMemo(() => {
    if (!editingSubscriptionId) {
      return undefined
    }

    const editingRow = subscriptionRows.find((row) => row.subscription.id === editingSubscriptionId)
    return editingRow ? createSubscriptionDraft(editingRow.subscription) : undefined
  }, [editingSubscriptionId, subscriptionRows])

  const handleSaveSubscription = async (nextSubscription: SubscriptionWorkbenchDraft) => {
    await upsertSubscription(nextSubscription)
    setCreatingSubscription(false)
    setEditingSubscriptionId(null)
  }

  const handleDuplicateSubscription = async (subscription: SubscriptionEntry) => {
    await upsertSubscription(duplicateSubscriptionDraft(subscription))
  }

  const handleDeleteSubscription = async (subscriptionId: string) => {
    await deleteSubscription(subscriptionId)
  }

  const handleToggleEnabled = async (subscription: SubscriptionEntry, enabled: boolean) => {
    await upsertSubscription({
      ...subscription,
      enabled
    })
  }

  return (
    <div className="space-y-8" data-testid="subscriptions-workbench">
      <div role="status" aria-live="polite">
        <Alert tone={status.tone} title={status.message} />
      </div>

      <SubscriptionsGlobalCard
        subscriptionsEnabled={policy.enabled}
        pollingIntervalMinutes={policy.pollingIntervalMinutes}
        notificationsEnabled={policy.notificationsEnabled}
        notificationDownloadActionEnabled={policy.notificationDownloadActionEnabled}
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
        onPollingIntervalMinutesChange={(minutes) =>
          setPolicy((current) => ({
            ...current,
            pollingIntervalMinutes: Number.isFinite(minutes) ? minutes : 30
          }))
        }
        onNotificationsEnabledChange={(enabled) =>
          setPolicy((current) => ({
            ...current,
            notificationsEnabled: enabled
          }))
        }
        onNotificationDownloadActionEnabledChange={(enabled) =>
          setPolicy((current) => ({
            ...current,
            notificationDownloadActionEnabled: enabled
          }))
        }
        onSave={() => void savePolicy()}
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

          <Button
            type="button"
            disabled={loading || mutatingSubscription}
            onClick={() => {
              setEditingSubscriptionId(null)
              setCreatingSubscription(true)
            }}>
            <HiOutlinePlus className="h-4 w-4" />
            {i18n.t("options.subscriptions.add")}
          </Button>
        </div>

        {subscriptionRows.length ? (
          <div className="grid gap-4">
            {subscriptionRows.map((row) => (
              <SubscriptionCard
                key={row.subscription.id}
                subscription={row.subscription}
                runtimeState={toSubscriptionRuntimeState(row)}
                onEdit={() => {
                  setCreatingSubscription(false)
                  setEditingSubscriptionId(row.subscription.id)
                }}
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
                    setEditingSubscriptionId(null)
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

      <SubscriptionEditorDialog
        open={creatingSubscription || editingSubscriptionId !== null}
        initialSubscription={initialSubscription}
        onClose={() => {
          setCreatingSubscription(false)
          setEditingSubscriptionId(null)
        }}
        onSave={handleSaveSubscription}
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
