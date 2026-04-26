import { z } from "zod"

import { downloaderConfigSchema } from "./config/schema"
import type { DownloaderConfig } from "./config/types"
import { getBrowser } from "../shared/browser"
import type {
  DownloaderValidationSnapshot,
  DownloaderValidationState,
  GeneralSettingsValidationResult
} from "../shared/types"

export const DOWNLOADER_VALIDATION_STORAGE_KEY = "downloader_validation"

const downloaderValidationSnapshotSchema = z.object({
  configFingerprint: z.string(),
  validatedAt: z.string(),
  version: z.string()
})

const downloaderValidationStateSchema = z.object({
  qbittorrent: downloaderValidationSnapshotSchema.optional(),
  transmission: downloaderValidationSnapshotSchema.optional()
})

const textEncoder = new TextEncoder()

export async function createDownloaderValidationResult(
  config: DownloaderConfig,
  snapshotInput: Pick<DownloaderValidationSnapshot, "validatedAt" | "version">
): Promise<GeneralSettingsValidationResult> {
  const sanitizedConfig = downloaderConfigSchema.parse(config)
  const activeId = sanitizedConfig.activeId
  const configFingerprint = await createDownloaderValidationFingerprint(sanitizedConfig)
  const snapshot = downloaderValidationSnapshotSchema.parse({
    configFingerprint,
    validatedAt: snapshotInput.validatedAt,
    version: snapshotInput.version
  })

  return {
    downloaderId: activeId,
    reusedExisting: false,
    ...snapshot
  }
}

export function mergeDownloaderValidationState(
  state: DownloaderValidationState,
  validation: GeneralSettingsValidationResult
): DownloaderValidationState {
  return {
    ...state,
    [validation.downloaderId]: {
      configFingerprint: validation.configFingerprint,
      validatedAt: validation.validatedAt,
      version: validation.version
    }
  }
}

export async function createDownloaderValidationFingerprint(
  config: DownloaderConfig
): Promise<string> {
  const sanitizedConfig = downloaderConfigSchema.parse(config)
  const activeProfile = sanitizedConfig.profiles[sanitizedConfig.activeId]
  const fingerprintPayload = JSON.stringify({
    activeId: sanitizedConfig.activeId,
    baseUrl: activeProfile.baseUrl,
    username: activeProfile.username,
    password: activeProfile.password
  })

  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is unavailable for downloader validation fingerprinting.")
  }

  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(fingerprintPayload)
  )

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function getDownloaderValidationState(): Promise<DownloaderValidationState> {
  const stored = await getBrowser().storage.local.get(DOWNLOADER_VALIDATION_STORAGE_KEY)
  const raw = stored[DOWNLOADER_VALIDATION_STORAGE_KEY]

  if (!raw) {
    return {}
  }

  const parsedState = downloaderValidationStateSchema.safeParse(raw)
  if (!parsedState.success) {
    return {}
  }

  return parsedState.data
}

export async function getMatchingDownloaderValidationSnapshot(
  config: DownloaderConfig
): Promise<DownloaderValidationSnapshot | null> {
  const sanitizedConfig = downloaderConfigSchema.parse(config)
  const activeId = sanitizedConfig.activeId
  const validationState = await getDownloaderValidationState()
  const snapshot = validationState[activeId]

  if (!snapshot) {
    return null
  }

  const currentFingerprint = await createDownloaderValidationFingerprint(sanitizedConfig)
  if (snapshot.configFingerprint !== currentFingerprint) {
    return null
  }

  return snapshot
}

export async function saveDownloaderValidationSnapshot(
  config: DownloaderConfig,
  snapshotInput: Pick<DownloaderValidationSnapshot, "validatedAt" | "version">
): Promise<GeneralSettingsValidationResult> {
  const existingState = await getDownloaderValidationState()
  const validation = await createDownloaderValidationResult(config, snapshotInput)

  await getBrowser().storage.local.set({
    [DOWNLOADER_VALIDATION_STORAGE_KEY]: mergeDownloaderValidationState(existingState, validation)
  })

  return validation
}
