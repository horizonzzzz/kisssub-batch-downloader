import type {
  Settings,
  SourceId,
  SubscriptionEntry,
  SubscriptionHitRecord,
  SubscriptionNotificationRound
} from "../shared/types"
import { resolveSourceEnabled } from "../settings"
import { createSubscriptionFingerprint } from "./fingerprint"
import { matchesSubscriptionCandidate } from "./match"
import {
  collectNotificationRoundHitIds,
  createSubscriptionNotificationRound,
  retainSubscriptionNotificationRounds
} from "./notifications"
import { pushRecentHit, pushSeenFingerprint } from "./retention"
import { scanSubscriptionCandidatesFromSource } from "./source-scan"
import { readSubscriptionRuntimeState, updateSubscriptionRuntimeState } from "./storage"
import type { SubscriptionCandidate, SubscriptionQuery } from "./types"

export type ScanSubscriptionsDependencies = {
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
  settings: Settings
  notificationRound: SubscriptionNotificationRound | null
  newHits: SubscriptionHitRecord[]
  scannedSourceIds: SourceId[]
  errors: SubscriptionScanError[]
}

export async function scanSubscriptions(
  settings: Settings,
  dependencies: ScanSubscriptionsDependencies = {}
): Promise<ScanSubscriptionsResult> {
  const now = dependencies.now?.() ?? new Date().toISOString()
  const scanCandidatesFromSource =
    dependencies.scanCandidatesFromSource ?? scanSubscriptionCandidatesFromSource
  const enabledSubscriptions = settings.subscriptions.filter(
    (subscription) => subscription.enabled && subscription.sourceIds.length > 0
  )

  let nextSettings: Settings = {
    ...settings,
    lastSchedulerRunAt: now
  }
  const newHits: SubscriptionHitRecord[] = []
  const scannedSourceIds: SourceId[] = []
  const errors: SubscriptionScanError[] = []

  if (!settings.subscriptionsEnabled || enabledSubscriptions.length === 0) {
    return {
      settings: nextSettings,
      notificationRound: null,
      newHits,
      scannedSourceIds,
      errors
    }
  }

  for (const [sourceId, sourceSubscriptions] of groupSubscriptionsBySource(
    settings,
    enabledSubscriptions
  )) {
    scannedSourceIds.push(sourceId)

    try {
      const candidates = await scanCandidatesFromSource(sourceId)

      for (const subscription of sourceSubscriptions) {
        nextSettings = applySubscriptionScanResult(
          nextSettings,
          subscription,
          candidates,
          now,
          newHits
        )
      }
    } catch (error) {
      const normalizedError = normalizeErrorMessage(error)
      errors.push({ sourceId, error: normalizedError })

      for (const subscription of sourceSubscriptions) {
        const state = readSubscriptionRuntimeState(nextSettings, subscription.id)
        nextSettings = updateSubscriptionRuntimeState(nextSettings, subscription.id, {
          lastScanAt: now,
          lastMatchedAt: state.lastMatchedAt,
          lastError: normalizedError,
          seenFingerprints: state.seenFingerprints,
          recentHits: state.recentHits
        })
      }
    }
  }

  const notificationRound =
    newHits.length > 0
      ? createSubscriptionNotificationRound({
          createdAt: now,
          hitIds: collectNotificationRoundHitIds(newHits)
        })
      : null

  if (notificationRound) {
    nextSettings = {
      ...nextSettings,
      subscriptionNotificationRounds: retainSubscriptionNotificationRounds([
        ...nextSettings.subscriptionNotificationRounds,
        notificationRound
      ])
    }
  }

  return {
    settings: nextSettings,
    notificationRound,
    newHits,
    scannedSourceIds,
    errors
  }
}

function groupSubscriptionsBySource(
  settings: Pick<Settings, "enabledSources">,
  subscriptions: SubscriptionEntry[]
): Map<SourceId, SubscriptionEntry[]> {
  const grouped = new Map<SourceId, SubscriptionEntry[]>()

  for (const subscription of subscriptions) {
    for (const sourceId of subscription.sourceIds) {
      if (!resolveSourceEnabled(sourceId, settings)) {
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
  settings: Settings,
  subscription: SubscriptionEntry,
  candidates: SubscriptionCandidate[],
  scannedAt: string,
  collectedHits: SubscriptionHitRecord[]
): Settings {
  const state = readSubscriptionRuntimeState(settings, subscription.id)
  const isFirstObservationScan = state.lastScanAt == null
  let seenFingerprints = state.seenFingerprints
  let recentHits = state.recentHits
  let lastMatchedAt = state.lastMatchedAt

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

    const hit = createSubscriptionHitRecord(
      subscription,
      candidate,
      fingerprint,
      matchResult.subgroup,
      scannedAt
    )
    recentHits = pushRecentHit(recentHits, hit)
    collectedHits.push(hit)
  }

  return updateSubscriptionRuntimeState(settings, subscription.id, {
    lastScanAt: scannedAt,
    lastMatchedAt,
    lastError: "",
    seenFingerprints,
    recentHits
  })
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
