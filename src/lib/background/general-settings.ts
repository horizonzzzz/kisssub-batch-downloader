import type { BatchExecutionConfig } from "../batch-config/types"
import { BATCH_EXECUTION_CONFIG_STORAGE_KEY } from "../batch-config/storage"
import { batchExecutionConfigSchema } from "../batch-config/schema"
import type { DownloaderConfig } from "../downloader/config/types"
import { DOWNLOADER_CONFIG_STORAGE_KEY } from "../downloader/config/storage"
import { downloaderConfigSchema } from "../downloader/config/schema"
import {
  createDownloaderValidationResult,
  DOWNLOADER_VALIDATION_STORAGE_KEY,
  getDownloaderValidationState,
  getMatchingDownloaderValidationSnapshot,
  mergeDownloaderValidationState
} from "../downloader/validation"
import { mapDownloaderValidationErrorToSaveMessage } from "../downloader/validation-errors"
import type {
  GeneralSettingsValidationResult,
  TestDownloaderConnectionResult
} from "../shared/types"
import { getBrowser } from "../shared/browser"
import { testDownloaderConnection } from "./service"

export type GeneralSettingsSavePayload = {
  downloaderConfig: DownloaderConfig
  batchExecutionConfig: BatchExecutionConfig
}

export type SaveGeneralSettingsDependencies = {
  now?: () => string
  testActiveDownloader?: (
    config: DownloaderConfig
  ) => Promise<Pick<TestDownloaderConnectionResult, "version">>
}

export type GeneralSettingsSaveResult = GeneralSettingsSavePayload & {
  validation: GeneralSettingsValidationResult
}

function createSaveValidationError(error: unknown): Error {
  return new Error(mapDownloaderValidationErrorToSaveMessage(error))
}

export async function saveGeneralSettings({
  downloaderConfig,
  batchExecutionConfig
}: GeneralSettingsSavePayload, dependencies: SaveGeneralSettingsDependencies = {}): Promise<GeneralSettingsSaveResult> {
  let sanitizedDownloaderConfig: DownloaderConfig
  try {
    sanitizedDownloaderConfig = downloaderConfigSchema.parse(downloaderConfig)
  } catch (error) {
    throw createSaveValidationError(error)
  }

  const sanitizedBatchExecutionConfig = batchExecutionConfigSchema.parse(batchExecutionConfig)
  const now = dependencies.now ?? (() => new Date().toISOString())
  const testActiveDownloader =
    dependencies.testActiveDownloader ??
    ((config: DownloaderConfig) =>
      testDownloaderConnection(config, {
        interactivePermissionRequest: false
      }))
  const existingSnapshot = await getMatchingDownloaderValidationSnapshot(sanitizedDownloaderConfig)

  let validation: GeneralSettingsValidationResult
  if (existingSnapshot) {
    validation = {
      downloaderId: sanitizedDownloaderConfig.activeId,
      reusedExisting: true,
      ...existingSnapshot
    }
  } else {
    let connection: Pick<TestDownloaderConnectionResult, "version">
    try {
      connection = await testActiveDownloader(sanitizedDownloaderConfig)
    } catch (error) {
      throw createSaveValidationError(error)
    }

    validation = await createDownloaderValidationResult(sanitizedDownloaderConfig, {
      validatedAt: now(),
      version: connection.version
    })
  }

  const storagePayload: Record<string, unknown> = {
    [DOWNLOADER_CONFIG_STORAGE_KEY]: sanitizedDownloaderConfig,
    [BATCH_EXECUTION_CONFIG_STORAGE_KEY]: sanitizedBatchExecutionConfig
  }

  if (!validation.reusedExisting) {
    const currentValidationState = await getDownloaderValidationState()
    storagePayload[DOWNLOADER_VALIDATION_STORAGE_KEY] = mergeDownloaderValidationState(
      currentValidationState,
      validation
    )
  }

  await getBrowser().storage.local.set(storagePayload)

  return {
    downloaderConfig: sanitizedDownloaderConfig,
    batchExecutionConfig: sanitizedBatchExecutionConfig,
    validation
  }
}
