import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { DEFAULT_DOWNLOADER_CONFIG } from "../../../src/lib/downloader/config/defaults"
import {
  createDownloaderValidationFingerprint,
  DOWNLOADER_VALIDATION_STORAGE_KEY,
  getDownloaderValidationState,
  getMatchingDownloaderValidationSnapshot,
  saveDownloaderValidationSnapshot
} from "../../../src/lib/downloader/validation"

vi.mock("../../../src/lib/shared/browser", () => ({
  getBrowser: () => fakeBrowser
}))

describe("downloader validation helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fakeBrowser.storage.local.clear()
  })

  it("builds a stable SHA-256 fingerprint from sanitized active downloader fields", async () => {
    const rawConfig = {
      activeId: "qbittorrent" as const,
      profiles: {
        qbittorrent: {
          baseUrl: " http://127.0.0.1:17474/// ",
          username: " admin ",
          password: "secret-password"
        },
        transmission: DEFAULT_DOWNLOADER_CONFIG.profiles.transmission
      }
    }

    const sanitizedConfig = {
      activeId: "qbittorrent" as const,
      profiles: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: "secret-password"
        },
        transmission: DEFAULT_DOWNLOADER_CONFIG.profiles.transmission
      }
    }

    const rawFingerprint = await createDownloaderValidationFingerprint(rawConfig)
    const sanitizedFingerprint = await createDownloaderValidationFingerprint(sanitizedConfig)
    const differentPasswordFingerprint = await createDownloaderValidationFingerprint({
      ...sanitizedConfig,
      profiles: {
        ...sanitizedConfig.profiles,
        qbittorrent: {
          ...sanitizedConfig.profiles.qbittorrent,
          password: "different-password"
        }
      }
    })

    expect(rawFingerprint).toMatch(/^[a-f0-9]{64}$/)
    expect(rawFingerprint).toBe(sanitizedFingerprint)
    expect(rawFingerprint).not.toBe(differentPasswordFingerprint)
    expect(rawFingerprint).not.toContain("secret-password")
  })

  it("returns empty validation state when storage is missing or invalid", async () => {
    expect(await getDownloaderValidationState()).toEqual({})

    await fakeBrowser.storage.local.set({
      [DOWNLOADER_VALIDATION_STORAGE_KEY]: {
        qbittorrent: {
          configFingerprint: 42,
          validatedAt: "2026-04-26T10:00:00.000Z",
          version: "5.0.0"
        }
      }
    })

    expect(await getDownloaderValidationState()).toEqual({})
  })

  it("persists snapshot for active downloader and never stores raw password", async () => {
    const preservedTransmissionSnapshot = {
      configFingerprint: "transmission-fingerprint",
      validatedAt: "2026-04-25T12:00:00.000Z",
      version: "4.9.0"
    }

    await fakeBrowser.storage.local.set({
      [DOWNLOADER_VALIDATION_STORAGE_KEY]: {
        transmission: preservedTransmissionSnapshot
      }
    })

    const result = await saveDownloaderValidationSnapshot({
      activeId: "qbittorrent",
      profiles: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: "secret-password"
        },
        transmission: DEFAULT_DOWNLOADER_CONFIG.profiles.transmission
      }
    }, {
      validatedAt: "2026-04-26T10:00:00.000Z",
      version: "5.0.0"
    })

    expect(result.downloaderId).toBe("qbittorrent")
    expect(result.reusedExisting).toBe(false)
    expect(result.validatedAt).toBe("2026-04-26T10:00:00.000Z")
    expect(result.version).toBe("5.0.0")
    expect(result.configFingerprint).toMatch(/^[a-f0-9]{64}$/)

    const stored = await fakeBrowser.storage.local.get(DOWNLOADER_VALIDATION_STORAGE_KEY)
    expect(stored[DOWNLOADER_VALIDATION_STORAGE_KEY]).toEqual({
      qbittorrent: {
        configFingerprint: result.configFingerprint,
        validatedAt: result.validatedAt,
        version: result.version
      },
      transmission: preservedTransmissionSnapshot
    })
    expect(JSON.stringify(stored[DOWNLOADER_VALIDATION_STORAGE_KEY])).not.toContain("secret-password")
  })

  it("returns matching snapshot only when active config fingerprint matches", async () => {
    const baseConfig = {
      activeId: "qbittorrent" as const,
      profiles: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: "secret-password"
        },
        transmission: DEFAULT_DOWNLOADER_CONFIG.profiles.transmission
      }
    }

    await saveDownloaderValidationSnapshot(baseConfig, {
      validatedAt: "2026-04-26T10:00:00.000Z",
      version: "5.0.0"
    })

    await expect(getMatchingDownloaderValidationSnapshot(baseConfig)).resolves.toEqual({
      configFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/),
      validatedAt: "2026-04-26T10:00:00.000Z",
      version: "5.0.0"
    })

    await expect(
      getMatchingDownloaderValidationSnapshot({
        ...baseConfig,
        profiles: {
          ...baseConfig.profiles,
          qbittorrent: {
            ...baseConfig.profiles.qbittorrent,
            password: "changed-password"
          }
        }
      })
    ).resolves.toBeNull()
  })
})

