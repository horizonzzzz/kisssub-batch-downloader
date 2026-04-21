import type {
  DownloaderAdapter,
  DownloaderTorrentFile,
  DownloaderUrlSubmissionResult
} from "../downloader"
import type { DownloaderConfig } from "../downloader/config/types"
import {
  classifyExtractionResult,
  createPreparedExtractionResult
} from "../download-preparation"
import type {
  BatchItem,
  ClassifiedBatchResult,
  ExtractionResult,
  SubscriptionEntry,
  SubscriptionHitRecord
} from "../shared/types"
import type { SourceConfig } from "../sources/config/types"
import type { ExtractionContext } from "../sources/types"
import type { SubscriptionPolicyConfig } from "./policy/types"
import { resolveSourceEnabled } from "../sources/config/selectors"
import { getBatchExecutionConfig } from "../batch-config/storage"
import { getDownloaderConfig } from "../downloader/config/storage"
import { buildExtractionContextFromConfigs } from "../background/job-state"
import { listSubscriptionsByIds } from "./catalog-repository"
import { subscriptionDb } from "./db"
import { getNotificationRound } from "./notification-round-repository"
import { parseSubscriptionNotificationRoundId } from "./notifications"
import { canDownloadSubscriptionNotifications } from "./policy"

export type DownloadSubscriptionHitsRequest = {
  roundId: string
}

export type DownloadSubscriptionHitsResult = {
  totalHits: number
  attemptedHits: number
  submittedCount: number
  duplicateCount: number
  failedCount: number
}

export type SubscriptionNotificationDownloadDependencies = {
  downloader: DownloaderAdapter
  fetchTorrentForUpload: (torrentUrl: string) => Promise<DownloaderTorrentFile>
  extractSingleItem: (item: BatchItem, context: ExtractionContext) => Promise<ExtractionResult>
  getDownloaderConfig?: () => Promise<DownloaderConfig>
  now?: () => string
}

type PreparedSubscriptionHit = {
  hitId: string
  classified: ClassifiedBatchResult
}

type SubmissionStatusByHitId = Record<
  string,
  {
    downloadStatus: SubscriptionHitRecord["downloadStatus"]
    downloadedAt: string | null
  }
>

export async function downloadSubscriptionNotificationHits(
  input: {
    subscriptionPolicy: SubscriptionPolicyConfig
    sourceConfig: SourceConfig
    roundId: string
  },
  dependencies: SubscriptionNotificationDownloadDependencies
): Promise<DownloadSubscriptionHitsResult> {
  const normalizedRoundId = parseSubscriptionNotificationRoundId(input.roundId)
  if (!normalizedRoundId) {
    throw new Error(
      `Invalid subscription notification round id: ${String(input.roundId ?? "")}`
    )
  }

  const notificationRound = await getNotificationRound(normalizedRoundId)
  if (!notificationRound) {
    throw new Error(`Subscription notification round not found: ${normalizedRoundId}`)
  }

  if (!canDownloadSubscriptionNotifications(input.subscriptionPolicy)) {
    await persistDownloadState(notificationRound.id, [])
    return createEmptyDownloadSubscriptionHitsResult()
  }

  const batchExecutionConfig = await getBatchExecutionConfig()
  const downloaderConfig = await (dependencies.getDownloaderConfig ?? getDownloaderConfig)()
  const extractionContext = buildExtractionContextFromConfigs(batchExecutionConfig, input.sourceConfig)
  const hits = notificationRound.hits.map((hit) => ({ ...hit }))
  const subscriptions = await listSubscriptionsByIds([
    ...new Set(hits.map((hit) => hit.subscriptionId))
  ])
  const subscriptionById = new Map(
    subscriptions.map((subscription) => [subscription.id, subscription] as const)
  )
  const actionableHits = hits
    .filter((hit) =>
      isSubscriptionHitDownloadable(
        hit,
        subscriptionById.get(hit.subscriptionId),
        input.sourceConfig
      )
    )
    .map((hit) => ({ ...hit }))
  const pendingHits = actionableHits.filter(
    (hit) => hit.downloadStatus !== "submitted" && hit.downloadStatus !== "duplicate"
  )
  const attemptedAt = dependencies.now?.() ?? new Date().toISOString()

  if (pendingHits.length === 0) {
    await persistDownloadState(notificationRound.id, actionableHits)
    return {
      totalHits: actionableHits.length,
      attemptedHits: 0,
      submittedCount: 0,
      duplicateCount: 0,
      failedCount: 0
    }
  }

  const seenHashes = new Set<string>()
  const seenUrls = new Set<string>()
  const statuses: SubmissionStatusByHitId = {}
  const preparedHits: PreparedSubscriptionHit[] = []
  let duplicateCount = 0
  let failedCount = 0

  for (const hit of pendingHits) {
    const classified = await prepareSubscriptionHit(
      hit,
      subscriptionById.get(hit.subscriptionId),
      input.sourceConfig,
      seenHashes,
      seenUrls,
      dependencies.extractSingleItem,
      extractionContext
    )

    if (classified.status === "ready") {
      preparedHits.push({
        hitId: hit.id,
        classified
      })
      continue
    }

    if (classified.status === "duplicate") {
      statuses[hit.id] = {
        downloadStatus: "duplicate",
        downloadedAt: attemptedAt
      }
      duplicateCount += 1
      continue
    }

    statuses[hit.id] = {
      downloadStatus: "failed",
      downloadedAt: null
    }
    failedCount += 1
  }

  if (preparedHits.length > 0) {
    try {
      await dependencies.downloader.authenticate(downloaderConfig)
      const submissionResult = await submitPreparedHits(
        preparedHits,
        downloaderConfig,
        dependencies.downloader,
        dependencies.fetchTorrentForUpload,
        attemptedAt
      )
      duplicateCount += submissionResult.duplicateCount
      failedCount += submissionResult.failedCount
      Object.assign(statuses, submissionResult.statuses)
    } catch {
      for (const preparedHit of preparedHits) {
        statuses[preparedHit.hitId] = {
          downloadStatus: "failed",
          downloadedAt: null
        }
      }
      failedCount += preparedHits.length
    }
  }

  const nextHits = actionableHits.map((hit) => {
    const status = statuses[hit.id]
    return status
      ? {
          ...hit,
          downloadStatus: status.downloadStatus,
          downloadedAt: status.downloadedAt
        }
      : hit
  })

  await persistDownloadState(notificationRound.id, nextHits)

  return {
    totalHits: actionableHits.length,
    attemptedHits: pendingHits.length,
    submittedCount: Object.values(statuses).filter((status) => status.downloadStatus === "submitted").length,
    duplicateCount,
    failedCount
  }
}

function createEmptyDownloadSubscriptionHitsResult(): DownloadSubscriptionHitsResult {
  return {
    totalHits: 0,
    attemptedHits: 0,
    submittedCount: 0,
    duplicateCount: 0,
    failedCount: 0
  }
}

async function persistDownloadState(
  roundId: string,
  hits: SubscriptionHitRecord[]
): Promise<void> {
  await subscriptionDb.transaction(
    "rw",
    subscriptionDb.subscriptionRuntime,
    subscriptionDb.notificationRounds,
    async () => {
      await updateRuntimeRowsForDownloadedHits(hits)

      const retainedHits = hits
        .filter((hit) => hit.downloadStatus !== "submitted" && hit.downloadStatus !== "duplicate")

      if (retainedHits.length === 0) {
        await subscriptionDb.notificationRounds.delete(roundId)
        return
      }

      const round = await subscriptionDb.notificationRounds.get(roundId)
      if (!round) {
        return
      }

      await subscriptionDb.notificationRounds.put({
        ...round,
        hits: retainedHits
      })
    }
  )
}

async function updateRuntimeRowsForDownloadedHits(
  hits: SubscriptionHitRecord[]
): Promise<void> {
  const subscriptionIds = Array.from(new Set(hits.map((hit) => hit.subscriptionId)))
  if (subscriptionIds.length === 0) {
    return
  }

  const rows = await subscriptionDb.subscriptionRuntime.bulkGet(subscriptionIds)
  const hitById = new Map(hits.map((hit) => [hit.id, hit] as const))
  const nextRows = rows.flatMap((row) => {
    if (!row) {
      return []
    }

    let changed = false
    const recentHits = row.recentHits.map((existingHit) => {
      const updatedHit = hitById.get(existingHit.id)
      if (!updatedHit) {
        return existingHit
      }

      changed = true
      return updatedHit
    })

    return changed
      ? [{
          ...row,
          recentHits
        }]
      : []
  })

  if (nextRows.length > 0) {
    await subscriptionDb.subscriptionRuntime.bulkPut(nextRows)
  }
}

function isSubscriptionHitDownloadable(
  hit: SubscriptionHitRecord,
  subscription: SubscriptionEntry | undefined,
  sourceConfig: SourceConfig
): boolean {
  return Boolean(subscription?.enabled) && resolveSourceEnabled(hit.sourceId, sourceConfig)
}

async function prepareSubscriptionHit(
  hit: SubscriptionHitRecord,
  subscription: SubscriptionEntry | undefined,
  sourceConfig: SourceConfig,
  seenHashes: Set<string>,
  seenUrls: Set<string>,
  extractSingleItem: (
    item: BatchItem,
    context: ExtractionContext
  ) => Promise<ExtractionResult>,
  context: ExtractionContext
): Promise<ClassifiedBatchResult> {
  const batchItem: BatchItem = {
    sourceId: hit.sourceId,
    detailUrl: hit.detailUrl,
    title: hit.title,
    ...(hit.magnetUrl ? { magnetUrl: hit.magnetUrl } : {}),
    ...(hit.torrentUrl ? { torrentUrl: hit.torrentUrl } : {})
  }

  const preparedResult = createPreparedExtractionResult(batchItem)
  if (preparedResult) {
    return classifyExtractionResult(hit.sourceId, preparedResult, sourceConfig, seenHashes, seenUrls)
  }

  try {
    const extractedResult = await extractSingleItem(batchItem, context)
    return classifyExtractionResult(hit.sourceId, extractedResult, sourceConfig, seenHashes, seenUrls)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Hidden detail extraction failed."
    return {
      ok: false,
      title: hit.title,
      detailUrl: hit.detailUrl,
      hash: "",
      magnetUrl: "",
      torrentUrl: "",
      status: "failed",
      deliveryMode: "",
      submitUrl: "",
      message,
      failureReason: message
    }
  }
}

async function submitPreparedHits(
  preparedHits: PreparedSubscriptionHit[],
  downloaderConfig: DownloaderConfig,
  downloader: DownloaderAdapter,
  fetchTorrentForUpload: (torrentUrl: string) => Promise<DownloaderTorrentFile>,
  attemptedAt: string
): Promise<{
  duplicateCount: number
  failedCount: number
  statuses: SubmissionStatusByHitId
}> {
  const statuses: SubmissionStatusByHitId = {}
  let duplicateCount = 0
  let failedCount = 0
  const urlPreparedHits = preparedHits.filter(
    (entry) => entry.classified.deliveryMode !== "torrent-file"
  )
  const torrentPreparedHits = preparedHits.filter(
    (entry) => entry.classified.deliveryMode === "torrent-file"
  )

  if (urlPreparedHits.length > 0) {
    try {
      const result = await downloader.addUrls(
        downloaderConfig,
        urlPreparedHits.map((entry) => entry.classified.submitUrl),
        undefined
      )
      const urlResult = applyUrlSubmissionStatuses(urlPreparedHits, result, attemptedAt)
      duplicateCount += urlResult.duplicateCount
      failedCount += urlResult.failedCount
      Object.assign(statuses, urlResult.statuses)
    } catch {
      for (const preparedHit of urlPreparedHits) {
        statuses[preparedHit.hitId] = {
          downloadStatus: "failed",
          downloadedAt: null
        }
      }
      failedCount += urlPreparedHits.length
    }
  }

  for (const preparedHit of torrentPreparedHits) {
    try {
      const torrent = await fetchTorrentForUpload(preparedHit.classified.submitUrl)
      await downloader.addTorrentFiles(downloaderConfig, [torrent], undefined)
      statuses[preparedHit.hitId] = {
        downloadStatus: "submitted",
        downloadedAt: attemptedAt
      }
    } catch {
      statuses[preparedHit.hitId] = {
        downloadStatus: "failed",
        downloadedAt: null
      }
      failedCount += 1
    }
  }

  return {
    duplicateCount,
    failedCount,
    statuses
  }
}

function applyUrlSubmissionStatuses(
  preparedHits: PreparedSubscriptionHit[],
  result: DownloaderUrlSubmissionResult,
  attemptedAt: string
): {
  duplicateCount: number
  failedCount: number
  statuses: SubmissionStatusByHitId
} {
  const statuses: SubmissionStatusByHitId = {}
  let duplicateCount = 0
  let failedCount = 0

  for (const [index, preparedHit] of preparedHits.entries()) {
    const entry = result.entries[index]
    if (entry?.status === "submitted") {
      statuses[preparedHit.hitId] = {
        downloadStatus: "submitted",
        downloadedAt: attemptedAt
      }
      continue
    }

    if (entry?.status === "duplicate") {
      statuses[preparedHit.hitId] = {
        downloadStatus: "duplicate",
        downloadedAt: attemptedAt
      }
      duplicateCount += 1
      continue
    }

    statuses[preparedHit.hitId] = {
      downloadStatus: "failed",
      downloadedAt: null
    }
    failedCount += 1
  }

  return {
    duplicateCount,
    failedCount,
    statuses
  }
}
