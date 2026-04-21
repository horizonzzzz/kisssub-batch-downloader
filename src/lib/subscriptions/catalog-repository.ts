import type { FilterCondition, SubscriptionEntry } from "../shared/types"

import { subscriptionDb } from "./db"

type NormalizedFilterCondition = Pick<FilterCondition, "field" | "operator" | "value">
type SubscriptionTrackingDefinition = Omit<
  SubscriptionEntry,
  "id" | "name" | "createdAt" | "baselineCreatedAt" | "advanced" | "enabled" | "deletedAt"
> & {
  advanced: {
    must: NormalizedFilterCondition[]
    any: NormalizedFilterCondition[]
  }
}

export async function listSubscriptionsIncludingDeleted(): Promise<SubscriptionEntry[]> {
  const subscriptions = await subscriptionDb.subscriptions.toArray()
  return sortSubscriptionsByCreatedAtDesc(subscriptions.map(normalizeSubscriptionRecord))
}

export async function listActiveSubscriptions(): Promise<SubscriptionEntry[]> {
  const subscriptions = await listSubscriptionsIncludingDeleted()
  return subscriptions.filter((subscription) => subscription.deletedAt === null)
}

export async function listSubscriptionsByIdsIncludingDeleted(
  ids: string[]
): Promise<SubscriptionEntry[]> {
  const normalizedIds = normalizeIds(ids)
  if (normalizedIds.length === 0) {
    return []
  }

  const subscriptions = await subscriptionDb.subscriptions.bulkGet(normalizedIds)
  return subscriptions
    .filter((subscription): subscription is SubscriptionEntry => subscription !== undefined)
    .map(normalizeSubscriptionRecord)
}

export async function createSubscriptionRecord(subscription: SubscriptionEntry): Promise<void> {
  await subscriptionDb.subscriptions.add(normalizeSubscriptionRecord({
    ...subscription,
    deletedAt: null
  }))
}

export async function setSubscriptionRecordEnabled(
  subscriptionId: string,
  enabled: boolean
): Promise<void> {
  const normalizedId = normalizeId(subscriptionId)
  if (!normalizedId) {
    return
  }

  await subscriptionDb.transaction(
    "rw",
    subscriptionDb.subscriptions,
    subscriptionDb.subscriptionRuntime,
    async () => {
      const existing = await subscriptionDb.subscriptions.get(normalizedId)
      if (!existing) {
        return
      }

      const normalizedExisting = normalizeSubscriptionRecord(existing)
      if (normalizedExisting.deletedAt !== null) {
        throw new Error(`Cannot update tombstoned subscription: ${normalizedId}`)
      }

      await subscriptionDb.subscriptions.put({
        ...normalizedExisting,
        enabled
      })

      if (normalizedExisting.enabled && !enabled) {
        await deleteSubscriptionRuntime(normalizedId)
      }
    }
  )
}

export async function softDeleteSubscriptionRecord(
  subscriptionId: string,
  deletedAt: string
): Promise<void> {
  const normalizedId = normalizeId(subscriptionId)
  if (!normalizedId) {
    return
  }

  await subscriptionDb.transaction(
    "rw",
    subscriptionDb.subscriptions,
    subscriptionDb.subscriptionRuntime,
    async () => {
      const existing = await subscriptionDb.subscriptions.get(normalizedId)
      if (!existing) {
        return
      }

      await subscriptionDb.subscriptions.put({
        ...normalizeSubscriptionRecord(existing),
        enabled: false,
        deletedAt
      })

      await deleteSubscriptionRuntime(normalizedId)
    }
  )
}

export async function listSubscriptions(): Promise<SubscriptionEntry[]> {
  return listSubscriptionsIncludingDeleted()
}

export async function listSubscriptionsByIds(ids: string[]): Promise<SubscriptionEntry[]> {
  return listSubscriptionsByIdsIncludingDeleted(ids)
}

export async function replaceSubscriptionCatalog(
  nextSubscriptions: SubscriptionEntry[]
): Promise<void> {
  assertActiveCatalogInput(nextSubscriptions)

  const nextById = new Map(
    nextSubscriptions.map((subscription) => [
      subscription.id,
      normalizeSubscriptionRecord({ ...subscription, deletedAt: null })
    ] as const)
  )

  await subscriptionDb.transaction(
    "rw",
    subscriptionDb.subscriptions,
    subscriptionDb.subscriptionRuntime,
    async () => {
      const previousSubscriptions = await subscriptionDb.subscriptions.toArray()
      const previousById = new Map(
        previousSubscriptions.map((subscription) => [
          subscription.id,
          normalizeSubscriptionRecord(subscription)
        ] as const)
      )

      for (const subscription of nextById.values()) {
        const previous = previousById.get(subscription.id)
        if (previous && previous.deletedAt !== null) {
          throw new Error(`Cannot replace tombstoned subscription: ${subscription.id}`)
        }

        await subscriptionDb.subscriptions.put(subscription)
      }

      const tombstoneTimestamp = new Date().toISOString()
      for (const previous of previousById.values()) {
        if (nextById.has(previous.id) || previous.deletedAt !== null) {
          continue
        }

        await subscriptionDb.subscriptions.put({
          ...previous,
          enabled: false,
          deletedAt: tombstoneTimestamp
        })
        await deleteSubscriptionRuntime(previous.id)
      }

      for (const [id, nextSubscription] of nextById.entries()) {
        const previous = previousById.get(id)
        if (previous && shouldInvalidateSubscriptionObservation(previous, nextSubscription)) {
          await deleteSubscriptionRuntime(id)
        }
      }
    }
  )
}

export async function upsertSubscription(subscription: SubscriptionEntry): Promise<void> {
  const normalizedSubscription = normalizeSubscriptionRecord(subscription)
  if (normalizedSubscription.deletedAt !== null) {
    throw new Error(
      `Cannot upsert tombstoned subscription: ${normalizedSubscription.id}`
    )
  }

  await subscriptionDb.transaction(
    "rw",
    subscriptionDb.subscriptions,
    subscriptionDb.subscriptionRuntime,
    async () => {
      const previous = await subscriptionDb.subscriptions.get(normalizedSubscription.id)
      const normalizedPrevious = previous ? normalizeSubscriptionRecord(previous) : null
      if (normalizedPrevious && normalizedPrevious.deletedAt !== null) {
        throw new Error(
          `Cannot update tombstoned subscription: ${normalizedSubscription.id}`
        )
      }

      await subscriptionDb.subscriptions.put(normalizedSubscription)

      if (
        normalizedPrevious &&
        shouldInvalidateSubscriptionObservation(normalizedPrevious, normalizedSubscription)
      ) {
        await deleteSubscriptionRuntime(normalizedSubscription.id)
      }
    }
  )
}

export async function deleteSubscription(subscriptionId: string): Promise<void> {
  await softDeleteSubscriptionRecord(subscriptionId, new Date().toISOString())
}

function normalizeSubscriptionRecord(subscription: SubscriptionEntry): SubscriptionEntry {
  return {
    ...subscription,
    deletedAt: subscription.deletedAt ?? null
  }
}

function assertActiveCatalogInput(subscriptions: SubscriptionEntry[]): void {
  for (const subscription of subscriptions) {
    const normalizedSubscription = normalizeSubscriptionRecord(subscription)
    if (normalizedSubscription.deletedAt !== null) {
      throw new Error(
        `Active catalog input cannot include tombstoned subscription: ${normalizedSubscription.id}`
      )
    }
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
    }
  }
}

function normalizeConditionForComparison(condition: FilterCondition): NormalizedFilterCondition {
  return {
    field: condition.field,
    operator: condition.operator,
    value: condition.value
  }
}

async function deleteSubscriptionRuntime(subscriptionId: string): Promise<void> {
  await subscriptionDb.subscriptionRuntime.delete(subscriptionId)
}

function sortSubscriptionsByCreatedAtDesc(
  subscriptions: SubscriptionEntry[]
): SubscriptionEntry[] {
  return [...subscriptions].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  )
}

function normalizeIds(ids: string[]): string[] {
  return Array.from(
    new Set(
      ids
        .map((id) => normalizeId(id))
        .filter((id): id is string => id.length > 0)
    )
  )
}

function normalizeId(id: string): string {
  return String(id ?? "").trim()
}
