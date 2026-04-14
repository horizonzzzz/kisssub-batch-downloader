import type {
  DownloaderAdapter,
  DownloaderTorrentFile,
  DownloaderUrlSubmissionResult
} from "../downloader"
import { getDownloaderAdapter } from "../downloader"
import { fetchTorrentForUpload } from "./torrent-file"
import { classifyExtractionResult, createPreparedExtractionResult } from "./preparation"
import { getExtensionUrl } from "../shared/browser"
import type {
  BatchItem,
  ClassifiedBatchResult,
  ExtractionResult,
  Settings,
  SubscriptionEntry,
  SubscriptionHitRecord,
  SubscriptionRuntimeState
} from "../shared/types"
import { getSettings, resolveSourceEnabled, saveSettings } from "../settings"
import { extractSingleItem } from "../sources/extraction"
import {
  buildSubscriptionRoundNotification,
  ensureSubscriptionAlarm,
  parseSubscriptionNotificationRoundId,
  readSubscriptionRuntimeState,
  scanSubscriptions
} from "../subscriptions"
import type {
  ScanSubscriptionsDependencies,
  ScanSubscriptionsResult,
  SubscriptionAlarmApi,
  SubscriptionRoundNotificationPayload
} from "../subscriptions"
import { getBrowser } from "../shared/browser"
import { i18n } from "../i18n"

let queuedSubscriptionMutation: Promise<void> = Promise.resolve()

type SubscriptionRuntimeSettingsPatch = Pick<
  Settings,
  "lastSchedulerRunAt" | "subscriptionRuntimeStateById" | "subscriptionNotificationRounds"
>

type SubscriptionDownloadRuntimeSettingsPatch = Pick<Settings, "subscriptionRuntimeStateById">

export type ExecuteSubscriptionScanDependencies = ScanSubscriptionsDependencies & {
  getSettings?: () => Promise<Settings>
  saveSettings?: (settings: SubscriptionRuntimeSettingsPatch) => Promise<Settings>
  createNotification?: (
    notificationId: string,
    options: SubscriptionRoundNotificationPayload["options"]
  ) => Promise<unknown>
}

export type ReconcileSubscriptionAlarmDependencies = {
  getSettings?: () => Promise<Settings>
  alarms?: SubscriptionAlarmApi
}

export type DownloadSubscriptionHitsRequest = {
  roundId: string
}

export type DownloadSubscriptionHitsDependencies = {
  getSettings?: () => Promise<Settings>
  saveSettings?: (settings: SubscriptionDownloadRuntimeSettingsPatch) => Promise<Settings>
  getDownloader?: (settings: Settings) => DownloaderAdapter
  fetchTorrentForUpload?: (torrentUrl: string) => Promise<DownloaderTorrentFile>
  extractSingleItem?: (item: BatchItem, settings: Settings) => Promise<ExtractionResult>
  now?: () => string
}

export type DownloadSubscriptionHitsResult = {
  settings: Settings
  totalHits: number
  attemptedHits: number
  submittedCount: number
  duplicateCount: number
  failedCount: number
}

export async function executeSubscriptionScan(
  dependencies: ExecuteSubscriptionScanDependencies = {}
): Promise<ScanSubscriptionsResult> {
  return enqueueSubscriptionMutation(() => executeSubscriptionScanOnce(dependencies))
}

export async function reconcileSubscriptionAlarm(
  dependencies: ReconcileSubscriptionAlarmDependencies = {}
): Promise<void> {
  const getSettingsImpl = dependencies.getSettings ?? getSettings
  const alarms = dependencies.alarms ?? getBrowser().alarms
  const settings = await getSettingsImpl()

  await ensureSubscriptionAlarm(settings, alarms)
}

export async function downloadSubscriptionHits(
  request: DownloadSubscriptionHitsRequest,
  dependencies: DownloadSubscriptionHitsDependencies = {}
): Promise<DownloadSubscriptionHitsResult> {
  return enqueueSubscriptionMutation(() =>
    downloadSubscriptionHitsOnce(request, dependencies)
  )
}

async function downloadSubscriptionHitsOnce(
  request: DownloadSubscriptionHitsRequest,
  dependencies: DownloadSubscriptionHitsDependencies = {}
): Promise<DownloadSubscriptionHitsResult> {
  const normalizedRoundId = parseSubscriptionNotificationRoundId(request.roundId)
  if (!normalizedRoundId) {
    throw new Error(`Invalid subscription notification round id: ${String(request.roundId ?? "")}`)
  }

  const getSettingsImpl = dependencies.getSettings ?? getSettings
  const saveSettingsImpl = dependencies.saveSettings ?? defaultSaveSettings
  const getDownloaderImpl =
    dependencies.getDownloader ??
    ((settings: Settings) => getDownloaderAdapter(settings.currentDownloaderId))
  const fetchTorrentForUploadImpl =
    dependencies.fetchTorrentForUpload ?? defaultFetchTorrentForUpload
  const extractSingleItemImpl = dependencies.extractSingleItem ?? defaultExtractSingleItem
  const attemptedAt = dependencies.now?.() ?? new Date().toISOString()
  const settings = await getSettingsImpl()
  const notificationRound = settings.subscriptionNotificationRounds.find(
    (round) => round.id === normalizedRoundId
  )

  if (!notificationRound) {
    throw new Error(`Subscription notification round not found: ${normalizedRoundId}`)
  }

  const runtimeStateById = cloneSubscriptionRuntimeStates(settings)
  const retainedHits = resolveRoundHits(notificationRound.hitIds, runtimeStateById)
  const pendingHits = retainedHits
    .filter((hit) => resolveSourceEnabled(hit.sourceId, settings))
    .filter((hit) => hit.downloadStatus !== "submitted" && hit.downloadStatus !== "duplicate")
  if (pendingHits.length === 0) {
    return {
      settings,
      totalHits: retainedHits.length,
      attemptedHits: 0,
      submittedCount: 0,
      duplicateCount: 0,
      failedCount: 0
    }
  }

  const subscriptionById = new Map(
    settings.subscriptions.map((subscription) => [subscription.id, subscription] as const)
  )
  const seenHashes = new Set<string>()
  const seenUrls = new Set<string>()
  const preparedHits: PreparedSubscriptionHit[] = []
  let duplicateCount = 0
  let failedCount = 0

  for (const hit of pendingHits) {
    const classified = await prepareSubscriptionHit(
      hit,
      subscriptionById.get(hit.subscriptionId),
      settings,
      seenHashes,
      seenUrls,
      extractSingleItemImpl
    )

    if (classified.status === "ready") {
      preparedHits.push({
        hitId: hit.id,
        classified
      })
      continue
    }

    if (classified.status === "duplicate") {
      updateRuntimeStateHit(runtimeStateById, hit.id, {
        downloadStatus: "duplicate",
        downloadedAt: attemptedAt
      })
      duplicateCount += 1
      continue
    }

    updateRuntimeStateHit(runtimeStateById, hit.id, {
      downloadStatus: "failed",
      downloadedAt: null
    })
    failedCount += 1
  }

  let submittedCount = 0
  if (preparedHits.length > 0) {
    const downloader = getDownloaderImpl(settings)
    try {
      await downloader.authenticate(settings)
      const submissionResult = await submitPreparedHits(
        preparedHits,
        settings,
        downloader,
        fetchTorrentForUploadImpl,
        attemptedAt
      )
      submittedCount += submissionResult.submittedCount
      failedCount += submissionResult.failedCount
      applySubmissionStatuses(runtimeStateById, submissionResult.statuses)
    } catch {
      for (const preparedHit of preparedHits) {
        updateRuntimeStateHit(runtimeStateById, preparedHit.hitId, {
          downloadStatus: "failed",
          downloadedAt: null
        })
      }
      failedCount += preparedHits.length
    }
  }

  const nextSettings = buildSettingsWithRuntimeStates(settings, runtimeStateById)
  const savedSettings = await saveSettingsImpl(buildSubscriptionDownloadRuntimePatch(nextSettings))

  return {
    settings: savedSettings,
    totalHits: retainedHits.length,
    attemptedHits: pendingHits.length,
    submittedCount,
    duplicateCount,
    failedCount
  }
}

async function executeSubscriptionScanOnce(
  dependencies: ExecuteSubscriptionScanDependencies
): Promise<ScanSubscriptionsResult> {
  const getSettingsImpl = dependencies.getSettings ?? getSettings
  const saveSettingsImpl = dependencies.saveSettings ?? defaultSaveSettings
  const createNotificationImpl =
    dependencies.createNotification ?? createBrowserNotification
  const settings = await getSettingsImpl()
  const result = await scanSubscriptions(settings, {
    now: dependencies.now,
    scanCandidatesFromSource: dependencies.scanCandidatesFromSource
  })
  const savedSettings = await saveSettingsImpl(buildSubscriptionScanRuntimePatch(result.settings))

  if (result.notificationRound && savedSettings.notificationsEnabled) {
    const hitCount = result.notificationRound.hitIds.length
    const notification = buildSubscriptionRoundNotification(result.notificationRound, {
      title: i18n.t("subscriptions.notification.title"),
      message:
        hitCount === 1
          ? i18n.t("subscriptions.notification.messageOne")
          : i18n.t("subscriptions.notification.messageMany", [hitCount]),
    }, {
      iconUrl: getExtensionUrl("icon.png")
    })
    try {
      await createNotificationImpl(notification.id, notification.options)
    } catch {
      // Notification delivery is best-effort once the scan result has been persisted.
    }
  }

  return {
    ...result,
    settings: savedSettings
  }
}

async function defaultSaveSettings(
  settings: SubscriptionRuntimeSettingsPatch | SubscriptionDownloadRuntimeSettingsPatch
): Promise<Settings> {
  return saveSettings(settings)
}

async function createBrowserNotification(
  notificationId: string,
  options: SubscriptionRoundNotificationPayload["options"]
): Promise<unknown> {
  return getBrowser().notifications.create(notificationId, {
    ...options,
    iconUrl: options.iconUrl ?? getExtensionUrl("icon.png")
  })
}

async function defaultFetchTorrentForUpload(torrentUrl: string): Promise<DownloaderTorrentFile> {
  return fetchTorrentForUpload(torrentUrl)
}

async function defaultExtractSingleItem(
  item: BatchItem,
  settings: Settings
): Promise<ExtractionResult> {
  return extractSingleItem(item, settings)
}

function enqueueSubscriptionMutation<T>(run: () => Promise<T>): Promise<T> {
  const execution = queuedSubscriptionMutation.then(run, run)
  queuedSubscriptionMutation = execution.then(
    () => undefined,
    () => undefined
  )

  return execution
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

function cloneSubscriptionRuntimeStates(
  settings: Settings
): Map<string, SubscriptionRuntimeState> {
  const runtimeStateById = new Map<string, SubscriptionRuntimeState>()

  for (const subscription of settings.subscriptions) {
    const state = readSubscriptionRuntimeState(settings, subscription.id)
    runtimeStateById.set(subscription.id, {
      ...state,
      seenFingerprints: [...state.seenFingerprints],
      recentHits: state.recentHits.map((hit) => ({ ...hit }))
    })
  }

  return runtimeStateById
}

function resolveRoundHits(
  hitIds: string[],
  runtimeStateById: Map<string, SubscriptionRuntimeState>
): SubscriptionHitRecord[] {
  const hitsById = new Map<string, SubscriptionHitRecord>()

  for (const state of runtimeStateById.values()) {
    for (const hit of state.recentHits) {
      hitsById.set(hit.id, hit)
    }
  }

  return hitIds
    .map((hitId) => hitsById.get(hitId))
    .filter((hit): hit is SubscriptionHitRecord => hit !== undefined)
}

async function prepareSubscriptionHit(
  hit: SubscriptionHitRecord,
  subscription: SubscriptionEntry | undefined,
  settings: Settings,
  seenHashes: Set<string>,
  seenUrls: Set<string>,
  extractSingleItemImpl: (
    item: BatchItem,
    settings: Settings
  ) => Promise<ExtractionResult>
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
    return classifyExtractionResult(hit.sourceId, preparedResult, settings, seenHashes, seenUrls)
  }

  if (subscription?.deliveryMode !== "allow-detail-extraction") {
    return {
      ok: false,
      title: hit.title,
      detailUrl: hit.detailUrl,
      hash: "",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: "No direct download link retained for this hit.",
      status: "failed",
      deliveryMode: "",
      submitUrl: "",
      message: "No direct download link retained for this hit."
    }
  }

  const extractedResult = await extractSingleItemImpl(batchItem, settings)
  return classifyExtractionResult(hit.sourceId, extractedResult, settings, seenHashes, seenUrls)
}

async function submitPreparedHits(
  preparedHits: PreparedSubscriptionHit[],
  settings: Settings,
  downloader: DownloaderAdapter,
  fetchTorrentForUploadImpl: (torrentUrl: string) => Promise<DownloaderTorrentFile>,
  attemptedAt: string
): Promise<{
  submittedCount: number
  failedCount: number
  statuses: SubmissionStatusByHitId
}> {
  const statuses: SubmissionStatusByHitId = {}
  let submittedCount = 0
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
        settings,
        urlPreparedHits.map((entry) => entry.classified.submitUrl),
        undefined
      )
      const urlResult = applyUrlSubmissionStatuses(urlPreparedHits, result, attemptedAt)
      submittedCount += urlResult.submittedCount
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
      const torrent = await fetchTorrentForUploadImpl(preparedHit.classified.submitUrl)
      await downloader.addTorrentFiles(settings, [torrent], undefined)
      statuses[preparedHit.hitId] = {
        downloadStatus: "submitted",
        downloadedAt: attemptedAt
      }
      submittedCount += 1
    } catch {
      statuses[preparedHit.hitId] = {
        downloadStatus: "failed",
        downloadedAt: null
      }
      failedCount += 1
    }
  }

  return {
    submittedCount,
    failedCount,
    statuses
  }
}

function applyUrlSubmissionStatuses(
  preparedHits: PreparedSubscriptionHit[],
  result: DownloaderUrlSubmissionResult,
  attemptedAt: string
): {
  submittedCount: number
  failedCount: number
  statuses: SubmissionStatusByHitId
} {
  const statuses: SubmissionStatusByHitId = {}
  let submittedCount = 0
  let failedCount = 0

  for (const [index, preparedHit] of preparedHits.entries()) {
    const entry = result.entries[index]
    if (entry?.status === "submitted") {
      statuses[preparedHit.hitId] = {
        downloadStatus: "submitted",
        downloadedAt: attemptedAt
      }
      submittedCount += 1
      continue
    }

    statuses[preparedHit.hitId] = {
      downloadStatus: "failed",
      downloadedAt: null
    }
    failedCount += 1
  }

  return {
    submittedCount,
    failedCount,
    statuses
  }
}

function applySubmissionStatuses(
  runtimeStateById: Map<string, SubscriptionRuntimeState>,
  statuses: SubmissionStatusByHitId
): void {
  for (const [hitId, status] of Object.entries(statuses)) {
    updateRuntimeStateHit(runtimeStateById, hitId, status)
  }
}

function updateRuntimeStateHit(
  runtimeStateById: Map<string, SubscriptionRuntimeState>,
  hitId: string,
  patch: Pick<SubscriptionHitRecord, "downloadStatus" | "downloadedAt">
): void {
  for (const [subscriptionId, state] of runtimeStateById.entries()) {
    const hitIndex = state.recentHits.findIndex((hit) => hit.id === hitId)
    if (hitIndex === -1) {
      continue
    }

    const existingHit = state.recentHits[hitIndex]
    if (!existingHit) {
      return
    }

    const nextHits = state.recentHits.slice()
    nextHits[hitIndex] = {
      ...existingHit,
      downloadStatus: patch.downloadStatus,
      downloadedAt: patch.downloadedAt
    }
    runtimeStateById.set(subscriptionId, {
      ...state,
      recentHits: nextHits
    })
    return
  }
}

function buildSettingsWithRuntimeStates(
  settings: Settings,
  runtimeStateById: Map<string, SubscriptionRuntimeState>
): Settings {
  return {
    ...settings,
    subscriptionRuntimeStateById: {
      ...settings.subscriptionRuntimeStateById,
      ...Object.fromEntries(runtimeStateById.entries())
    }
  }
}

function buildSubscriptionScanRuntimePatch(
  settings: Settings
): SubscriptionRuntimeSettingsPatch {
  return {
    lastSchedulerRunAt: settings.lastSchedulerRunAt,
    subscriptionRuntimeStateById: settings.subscriptionRuntimeStateById,
    subscriptionNotificationRounds: settings.subscriptionNotificationRounds
  }
}

function buildSubscriptionDownloadRuntimePatch(
  settings: Pick<Settings, "subscriptionRuntimeStateById">
): SubscriptionDownloadRuntimeSettingsPatch {
  return {
    subscriptionRuntimeStateById: settings.subscriptionRuntimeStateById
  }
}
