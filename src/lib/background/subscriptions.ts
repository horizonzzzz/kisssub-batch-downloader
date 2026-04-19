import type { DownloaderAdapter, DownloaderTorrentFile } from "../downloader"
import { getDownloaderAdapter } from "../downloader"
import { getBrowser, getExtensionUrl } from "../shared/browser"
import type {
  AppSettings,
  BatchItem,
  ExtractionResult,
  SubscriptionEntry
} from "../shared/types"
import type { SourceConfig } from "../sources/config/types"
import type { ExtractionContext } from "../sources/types"
import { getSettings } from "../settings"
import { getSourceConfig } from "../sources/config"
import { getBatchExecutionConfig } from "../batch-config/storage"
import { extractSingleItem } from "../sources/extraction"
import {
  buildSubscriptionRoundNotification,
  canCreateSubscriptionNotifications,
  clearNotificationRounds,
  deleteSubscription,
  ensureSubscriptionAlarm,
  listNotificationRounds,
  replaceSubscriptionCatalog,
  SubscriptionManager,
  upsertSubscription,
  type DownloadSubscriptionHitsRequest,
  type DownloadSubscriptionHitsResult,
  type ScanSubscriptionsDependencies,
  type ScanSubscriptionsResult,
  type SubscriptionAlarmApi,
  type SubscriptionRoundNotificationPayload
} from "../subscriptions"
import { i18n } from "../i18n"
import { fetchTorrentForUpload } from "./torrent-file"

let queuedSubscriptionMutation: Promise<void> = Promise.resolve()

export type ExecuteSubscriptionScanDependencies = Omit<
  ScanSubscriptionsDependencies,
  "appSettings" | "sourceConfig" | "subscriptions"
> & {
  getSettings?: () => Promise<AppSettings>
  getSourceConfig?: () => Promise<SourceConfig>
  createNotification?: (
    notificationId: string,
    options: SubscriptionRoundNotificationPayload["options"]
  ) => Promise<unknown>
}

export type ReconcileSubscriptionAlarmDependencies = {
  getSettings?: () => Promise<AppSettings>
  alarms?: SubscriptionAlarmApi
}

export type SubscriptionCatalogCommandDependencies = {
  getSettings?: () => Promise<AppSettings>
  saveSettings?: (settings: Partial<AppSettings>) => Promise<AppSettings>
}

export type DownloadSubscriptionHitsDependencies = {
  getSettings?: () => Promise<AppSettings>
  getSourceConfig?: () => Promise<SourceConfig>
  getDownloader?: (settings: AppSettings) => DownloaderAdapter
  fetchTorrentForUpload?: (torrentUrl: string) => Promise<DownloaderTorrentFile>
  extractSingleItem?: (item: BatchItem, context: ExtractionContext) => Promise<ExtractionResult>
  now?: () => string
}

export type ClearPendingSubscriptionNotificationsDependencies = {
  clearBrowserNotification?: (notificationId: string) => Promise<unknown>
}

export async function executeSubscriptionScan(
  dependencies: ExecuteSubscriptionScanDependencies = {}
): Promise<ScanSubscriptionsResult> {
  return enqueueSubscriptionMutation(async () => {
    const appSettings = await (dependencies.getSettings ?? getSettings)()
    const sourceConfig = await (dependencies.getSourceConfig ?? getSourceConfig)()
    const manager = new SubscriptionManager({
      appSettings,
      sourceConfig,
      now: dependencies.now
    })
    const result = await manager.scan({
      scanCandidatesFromSource: dependencies.scanCandidatesFromSource
    })

    if (result.notificationRound && canCreateSubscriptionNotifications(appSettings)) {
      const hitCount = result.notificationRound.hits.length
      const notification = buildSubscriptionRoundNotification(
        result.notificationRound,
        {
          title: i18n.t("subscriptions.notification.title"),
          message:
            hitCount === 1
              ? i18n.t("subscriptions.notification.messageOne")
              : i18n.t("subscriptions.notification.messageMany", [hitCount])
        },
        {
          iconUrl: getExtensionUrl("icon.png")
        }
      )

      try {
        await (dependencies.createNotification ?? createBrowserNotification)(
          notification.id,
          notification.options
        )
      } catch {
        // Best effort after persistence.
      }
    }

    return result
  })
}

export async function clearPendingSubscriptionNotifications(
  dependencies: ClearPendingSubscriptionNotificationsDependencies = {}
): Promise<void> {
  return enqueueSubscriptionMutation(async () => {
    const rounds = await listNotificationRounds()
    if (rounds.length === 0) {
      return
    }

    await clearNotificationRounds()

    const clearBrowserNotification =
      dependencies.clearBrowserNotification ?? defaultClearBrowserNotification

    for (const round of rounds) {
      try {
        await clearBrowserNotification(round.id)
      } catch {
        // Best effort cleanup after persistence.
      }
    }
  })
}

export async function reconcileSubscriptionAlarm(
  dependencies: ReconcileSubscriptionAlarmDependencies = {}
): Promise<void> {
  const getSettingsImpl = dependencies.getSettings ?? getSettings
  const alarms = dependencies.alarms ?? getBrowser().alarms
  const settings = await getSettingsImpl()

  await ensureSubscriptionAlarm(settings, alarms)
}

export async function upsertSubscriptionDefinition(
  subscription: SubscriptionEntry,
  _dependencies: SubscriptionCatalogCommandDependencies = {}
): Promise<void> {
  return enqueueSubscriptionMutation(async () => {
    await upsertSubscription(subscription)
  })
}

export async function deleteSubscriptionDefinition(
  subscriptionId: string,
  _dependencies: SubscriptionCatalogCommandDependencies = {}
): Promise<void> {
  return enqueueSubscriptionMutation(async () => {
    await deleteSubscription(subscriptionId)
  })
}

export async function replaceSubscriptionDefinitions(
  subscriptions: SubscriptionEntry[],
  _dependencies: SubscriptionCatalogCommandDependencies = {}
): Promise<void> {
  return enqueueSubscriptionMutation(async () => {
    await replaceSubscriptionCatalog(subscriptions)
  })
}

export async function downloadSubscriptionHits(
  request: DownloadSubscriptionHitsRequest,
  dependencies: DownloadSubscriptionHitsDependencies = {}
): Promise<DownloadSubscriptionHitsResult> {
  return enqueueSubscriptionMutation(async () => {
    const appSettings = await (dependencies.getSettings ?? getSettings)()
    const sourceConfig = await (dependencies.getSourceConfig ?? getSourceConfig)()
    const manager = new SubscriptionManager({
      appSettings,
      sourceConfig
    })
    const getDownloaderImpl =
      dependencies.getDownloader ??
      ((settings: AppSettings) => getDownloaderAdapter(settings.currentDownloaderId))

    return manager.downloadFromNotification(request, {
      downloader: getDownloaderImpl(appSettings),
      fetchTorrentForUpload:
        dependencies.fetchTorrentForUpload ?? defaultFetchTorrentForUpload,
      extractSingleItem: dependencies.extractSingleItem ?? defaultExtractSingleItem,
      now: dependencies.now
    })
  })
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

async function defaultFetchTorrentForUpload(
  torrentUrl: string
): Promise<DownloaderTorrentFile> {
  return fetchTorrentForUpload(torrentUrl)
}

async function defaultExtractSingleItem(
  item: BatchItem,
  context: ExtractionContext
): Promise<ExtractionResult> {
  return extractSingleItem(item, context)
}

async function defaultClearBrowserNotification(notificationId: string): Promise<unknown> {
  return getBrowser().notifications.clear(notificationId)
}

function enqueueSubscriptionMutation<T>(run: () => Promise<T>): Promise<T> {
  const execution = queuedSubscriptionMutation.then(run, run)
  queuedSubscriptionMutation = execution.then(
    () => undefined,
    () => undefined
  )

  return execution
}
