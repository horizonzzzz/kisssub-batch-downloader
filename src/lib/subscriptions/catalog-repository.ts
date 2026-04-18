import type { FilterCondition, SubscriptionEntry } from "../shared/types"

import { subscriptionDb } from "./db"

type NormalizedFilterCondition = Pick<FilterCondition, "field" | "operator" | "value">
type SubscriptionTrackingDefinition = Omit<
  SubscriptionEntry,
  "id" | "name" | "createdAt" | "baselineCreatedAt" | "advanced" | "enabled"
> & {
  advanced: {
    must: NormalizedFilterCondition[]
    any: NormalizedFilterCondition[]
  }
}

export async function listSubscriptions(): Promise<SubscriptionEntry[]> {
  const subscriptions = await subscriptionDb.subscriptions.toArray()
  return subscriptions.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
}

export async function listSubscriptionsByIds(ids: string[]): Promise<SubscriptionEntry[]> {
  const normalizedIds = normalizeIds(ids)
  if (normalizedIds.length === 0) {
    return []
  }

  const subscriptions = await subscriptionDb.subscriptions.bulkGet(normalizedIds)
  return subscriptions.filter((subscription): subscription is SubscriptionEntry => subscription !== undefined)
}

export async function replaceSubscriptionCatalog(
  nextSubscriptions: SubscriptionEntry[]
): Promise<void> {
  await subscriptionDb.transaction(
    "rw",
    subscriptionDb.subscriptions,
    subscriptionDb.subscriptionRuntime,
    subscriptionDb.notificationRounds,
    async () => {
      const previousSubscriptions = await subscriptionDb.subscriptions.toArray()
      const previousById = new Map(
        previousSubscriptions.map((subscription) => [subscription.id, subscription] as const)
      )
      const nextIds = new Set(nextSubscriptions.map((subscription) => subscription.id))
      const removedIds = previousSubscriptions
        .map((subscription) => subscription.id)
        .filter((id) => !nextIds.has(id))
      const changedIds = nextSubscriptions
        .filter((subscription) => {
          const previous = previousById.get(subscription.id)
          return previous
            ? shouldInvalidateSubscriptionObservation(previous, subscription)
            : false
        })
        .map((subscription) => subscription.id)

      await subscriptionDb.subscriptions.clear()
      if (nextSubscriptions.length > 0) {
        await subscriptionDb.subscriptions.bulkPut(nextSubscriptions)
      }

      await invalidateSubscriptionObservationState([...removedIds, ...changedIds])
    }
  )
}

export async function upsertSubscription(subscription: SubscriptionEntry): Promise<void> {
  await subscriptionDb.transaction(
    "rw",
    subscriptionDb.subscriptions,
    subscriptionDb.subscriptionRuntime,
    subscriptionDb.notificationRounds,
    async () => {
      const previous = await subscriptionDb.subscriptions.get(subscription.id)

      await subscriptionDb.subscriptions.put(subscription)

      if (previous && shouldInvalidateSubscriptionObservation(previous, subscription)) {
        await invalidateSubscriptionObservationState([subscription.id])
      }
    }
  )
}

export async function deleteSubscription(subscriptionId: string): Promise<void> {
  const normalizedId = String(subscriptionId ?? "").trim()
  if (!normalizedId) {
    return
  }

  await subscriptionDb.transaction(
    "rw",
    subscriptionDb.subscriptions,
    subscriptionDb.subscriptionRuntime,
    subscriptionDb.notificationRounds,
    async () => {
      await subscriptionDb.subscriptions.delete(normalizedId)
      await invalidateSubscriptionObservationState([normalizedId])
    }
  )
}

async function invalidateSubscriptionObservationState(subscriptionIds: string[]): Promise<void> {
  const normalizedIds = normalizeIds(subscriptionIds)
  if (normalizedIds.length === 0) {
    return
  }

  await subscriptionDb.subscriptionRuntime.bulkDelete(normalizedIds)

  await pruneNotificationRoundsForDeletedSubscriptions(new Set(normalizedIds))
}

async function pruneNotificationRoundsForDeletedSubscriptions(
  deletedSubscriptionIds: ReadonlySet<string>
): Promise<void> {
  if (deletedSubscriptionIds.size === 0) {
    return
  }

  const rounds = await subscriptionDb.notificationRounds.toArray()

  for (const round of rounds) {
    const nextHits = round.hits.filter((hit) => !deletedSubscriptionIds.has(hit.subscriptionId))

    if (nextHits.length === round.hits.length) {
      continue
    }

    if (nextHits.length === 0) {
      await subscriptionDb.notificationRounds.delete(round.id)
      continue
    }

    await subscriptionDb.notificationRounds.put({
      ...round,
      hits: nextHits
    })
  }
}

function hasSubscriptionTrackingDefinitionChanged(
  previousSubscription: SubscriptionEntry,
  nextSubscription: SubscriptionEntry
): boolean {
  return JSON.stringify(toTrackingDefinition(previousSubscription)) !==
    JSON.stringify(toTrackingDefinition(nextSubscription))
}

function shouldInvalidateSubscriptionObservation(
  previousSubscription: SubscriptionEntry,
  nextSubscription: SubscriptionEntry
): boolean {
  return isSubscriptionBeingDisabled(previousSubscription, nextSubscription) ||
    hasSubscriptionTrackingDefinitionChanged(previousSubscription, nextSubscription)
}

function isSubscriptionBeingDisabled(
  previousSubscription: SubscriptionEntry,
  nextSubscription: SubscriptionEntry
): boolean {
  return previousSubscription.enabled && !nextSubscription.enabled
}

function toTrackingDefinition(subscription: SubscriptionEntry): SubscriptionTrackingDefinition {
  return {
    sourceIds: subscription.sourceIds,
    multiSiteModeEnabled: subscription.multiSiteModeEnabled,
    titleQuery: subscription.titleQuery,
    subgroupQuery: subscription.subgroupQuery,
    advanced: {
      must: subscription.advanced.must.map(normalizeConditionForComparison),
      any: subscription.advanced.any.map(normalizeConditionForComparison)
    },
    deliveryMode: subscription.deliveryMode
  }
}

function normalizeConditionForComparison(condition: FilterCondition): NormalizedFilterCondition {
  return {
    field: condition.field,
    operator: condition.operator,
    value: condition.value
  }
}

function normalizeIds(ids: string[]): string[] {
  return Array.from(
    new Set(
      ids
        .map((id) => String(id ?? "").trim())
        .filter((id) => id.length > 0)
    )
  )
}
