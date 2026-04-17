import type {
  AppSettings,
  SourceId,
  SubscriptionEntry,
  SubscriptionHitRecord
} from "../shared/types"
import { resolveSourceEnabled } from "../settings"
import { subscriptionDb } from "./db"
import { createSubscriptionFingerprint } from "./fingerprint"
import { matchesSubscriptionCandidate } from "./match"
import {
  createSubscriptionNotificationRound,
  retainSubscriptionNotificationRounds
} from "./notifications"
import { pushSeenFingerprint } from "./retention"
import { createEmptySubscriptionRuntimeRow } from "./runtime-state"
import { scanSubscriptionCandidatesFromSource } from "./source-scan"
import type { NotificationRoundRow, SubscriptionRuntimeRow } from "./store-types"
import type { SubscriptionCandidate, SubscriptionQuery } from "./types"
import { LAST_SCHEDULER_RUN_AT_META_KEY } from "./runtime-query"

export type ScanSubscriptionsDependencies = {
  appSettings: AppSettings
  subscriptions: SubscriptionEntry[]
  now?: () => string
  scanCandidatesFromSource?: (
    sourceId: SourceId
  ) => Promise<SubscriptionCandidate[]>
}

export type SubscriptionScanError = {
  sourceId: SourceId
  error: string
}

export type ScanSubscriptionsResult = {
  lastSchedulerRunAt: string
  notificationRound: NotificationRoundRow | null
  newHits: SubscriptionHitRecord[]
  scannedSourceIds: SourceId[]
  errors: SubscriptionScanError[]
}

export async function scanSubscriptions(
  input: ScanSubscriptionsDependencies
): Promise<ScanSubscriptionsResult> {
  const now = input.now?.() ?? new Date().toISOString()
  const scanCandidatesFromSource =
    input.scanCandidatesFromSource ?? scanSubscriptionCandidatesFromSource
  const enabledSubscriptions = input.subscriptions.filter(
    (subscription) => subscription.enabled && subscription.sourceIds.length > 0
  )
  const runtimeBySubscriptionId = await loadRuntimeRows(enabledSubscriptions)
  const newHits: SubscriptionHitRecord[] = []
  const scannedSourceIds: SourceId[] = []
  const errors: SubscriptionScanError[] = []

  if (!input.appSettings.subscriptionsEnabled || enabledSubscriptions.length === 0) {
    await persistScanState(now, runtimeBySubscriptionId, newHits, null)
    return {
      lastSchedulerRunAt: now,
      notificationRound: null,
      newHits,
      scannedSourceIds,
      errors
    }
  }

  for (const [sourceId, sourceSubscriptions] of groupSubscriptionsBySource(
    input.appSettings,
    enabledSubscriptions
  )) {
    scannedSourceIds.push(sourceId)

    try {
      const candidates = await scanCandidatesFromSource(sourceId)

      for (const subscription of sourceSubscriptions) {
        const updatedRuntime = applySubscriptionScanResult(
          runtimeBySubscriptionId.get(subscription.id) ??
            createEmptySubscriptionRuntimeRow(subscription.id),
          subscription,
          candidates,
          now,
          newHits
        )
        runtimeBySubscriptionId.set(subscription.id, updatedRuntime)
      }
    } catch (error) {
      const normalizedError = normalizeErrorMessage(error)
      errors.push({ sourceId, error: normalizedError })

      for (const subscription of sourceSubscriptions) {
        const current = runtimeBySubscriptionId.get(subscription.id) ??
          createEmptySubscriptionRuntimeRow(subscription.id)

        runtimeBySubscriptionId.set(subscription.id, {
          ...current,
          lastScanAt: now,
          lastError: normalizedError
        })
      }
    }
  }

  const notificationRound =
    newHits.length > 0
      ? createSubscriptionNotificationRound({
          createdAt: now,
          hits: newHits
        })
      : null

  await persistScanState(now, runtimeBySubscriptionId, newHits, notificationRound)

  return {
    lastSchedulerRunAt: now,
    notificationRound,
    newHits,
    scannedSourceIds,
    errors
  }
}

async function loadRuntimeRows(
  subscriptions: SubscriptionEntry[]
): Promise<Map<string, SubscriptionRuntimeRow>> {
  const subscriptionIds = subscriptions.map((subscription) => subscription.id)
  const rows = await subscriptionDb.subscriptionRuntime.bulkGet(subscriptionIds)

  return new Map(
    subscriptionIds.map((subscriptionId, index) => [
      subscriptionId,
      rows[index] ?? createEmptySubscriptionRuntimeRow(subscriptionId)
    ] as const)
  )
}

async function persistScanState(
  lastSchedulerRunAt: string,
  runtimeBySubscriptionId: Map<string, SubscriptionRuntimeRow>,
  newHits: SubscriptionHitRecord[],
  notificationRound: NotificationRoundRow | null
): Promise<void> {
  await subscriptionDb.transaction(
    "rw",
    subscriptionDb.subscriptionRuntime,
    subscriptionDb.subscriptionHits,
    subscriptionDb.notificationRounds,
    subscriptionDb.subscriptionMeta,
    async () => {
      const runtimeRows = [...runtimeBySubscriptionId.values()]
      if (runtimeRows.length > 0) {
        await subscriptionDb.subscriptionRuntime.bulkPut(runtimeRows)
      }

      if (newHits.length > 0) {
        await subscriptionDb.subscriptionHits.bulkPut(newHits)
      }

      await subscriptionDb.subscriptionMeta.put({
        key: LAST_SCHEDULER_RUN_AT_META_KEY,
        value: lastSchedulerRunAt
      })

      if (!notificationRound) {
        return
      }

      const existingRounds = await subscriptionDb.notificationRounds.toArray()
      const nextRounds = retainSubscriptionNotificationRounds([
        ...existingRounds,
        notificationRound
      ])

      await subscriptionDb.notificationRounds.clear()
      await subscriptionDb.notificationRounds.bulkPut(nextRounds)
    }
  )
}

function groupSubscriptionsBySource(
  appSettings: Pick<AppSettings, "enabledSources">,
  subscriptions: SubscriptionEntry[]
): Map<SourceId, SubscriptionEntry[]> {
  const grouped = new Map<SourceId, SubscriptionEntry[]>()

  for (const subscription of subscriptions) {
    for (const sourceId of subscription.sourceIds) {
      if (!resolveSourceEnabled(sourceId, appSettings)) {
        continue
      }

      const existing = grouped.get(sourceId)
      if (existing) {
        existing.push(subscription)
        continue
      }

      grouped.set(sourceId, [subscription])
    }
  }

  return grouped
}

function applySubscriptionScanResult(
  runtime: SubscriptionRuntimeRow,
  subscription: SubscriptionEntry,
  candidates: SubscriptionCandidate[],
  scannedAt: string,
  collectedHits: SubscriptionHitRecord[]
): SubscriptionRuntimeRow {
  const isFirstObservationScan = runtime.lastScanAt == null
  let seenFingerprints = runtime.seenFingerprints
  let lastMatchedAt = runtime.lastMatchedAt

  for (const candidate of candidates) {
    const matchResult = matchesSubscriptionCandidate({
      query: createSubscriptionQuery(subscription),
      candidate
    })
    if (!matchResult.matched) {
      continue
    }

    lastMatchedAt = scannedAt
    const fingerprint = createSubscriptionFingerprint(candidate)
    const wasSeen = seenFingerprints.includes(fingerprint)
    seenFingerprints = pushSeenFingerprint(seenFingerprints, fingerprint)

    if (wasSeen || isFirstObservationScan) {
      continue
    }

    collectedHits.push(
      createSubscriptionHitRecord(
        subscription,
        candidate,
        fingerprint,
        matchResult.subgroup,
        scannedAt
      )
    )
  }

  return {
    subscriptionId: subscription.id,
    lastScanAt: scannedAt,
    lastMatchedAt,
    lastError: "",
    seenFingerprints
  }
}

function createSubscriptionQuery(subscription: SubscriptionEntry): SubscriptionQuery {
  return {
    titleQuery: subscription.titleQuery,
    subgroupQuery: subscription.subgroupQuery,
    advanced: {
      must: subscription.advanced.must,
      any: subscription.advanced.any
    }
  }
}

function createSubscriptionHitRecord(
  subscription: SubscriptionEntry,
  candidate: SubscriptionCandidate,
  fingerprint: string,
  subgroup: string,
  discoveredAt: string
): SubscriptionHitRecord {
  return {
    id: createSubscriptionHitId(subscription.id, fingerprint),
    subscriptionId: subscription.id,
    sourceId: candidate.sourceId,
    title: candidate.title,
    normalizedTitle: candidate.normalizedTitle,
    subgroup,
    detailUrl: candidate.detailUrl,
    magnetUrl: candidate.magnetUrl,
    torrentUrl: candidate.torrentUrl,
    discoveredAt,
    downloadedAt: null,
    downloadStatus: "idle"
  }
}

function createSubscriptionHitId(subscriptionId: string, fingerprint: string): string {
  return `subscription-hit:${subscriptionId}:${encodeURIComponent(fingerprint)}`
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return String(error ?? "Unknown subscription scan error.")
}
