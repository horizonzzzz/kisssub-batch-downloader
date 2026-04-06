import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "../../../lib/settings/defaults"
import type { Settings } from "../../../lib/shared/types"

const {
  getSettingsMock,
  mergeSettingsMock,
  sanitizeSettingsMock,
  getDownloaderAdapterMock,
  getDownloaderMetaMock,
  testConnectionMock
} = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
  mergeSettingsMock: vi.fn(),
  sanitizeSettingsMock: vi.fn(),
  getDownloaderAdapterMock: vi.fn(),
  getDownloaderMetaMock: vi.fn(),
  testConnectionMock: vi.fn()
}))

vi.mock("../../../lib/settings", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/settings")>(
    "../../../lib/settings"
  )

  return {
    ...actual,
    getSettings: getSettingsMock,
    mergeSettings: mergeSettingsMock,
    sanitizeSettings: sanitizeSettingsMock
  }
})

vi.mock("../../../lib/downloader", () => ({
  getDownloaderAdapter: getDownloaderAdapterMock,
  getDownloaderMeta: getDownloaderMetaMock
}))

import { testDownloaderConnection } from "../../../lib/background/service"

describe("testDownloaderConnection", () => {
  const storedSettings: Settings = {
    ...DEFAULT_SETTINGS,
    downloaders: {
      ...DEFAULT_SETTINGS.downloaders,
      qbittorrent: {
        baseUrl: "http://127.0.0.1:7474",
        username: "admin",
        password: "secret"
      }
    }
  }

  const sanitizedSettings: Settings = {
    ...storedSettings,
    downloaders: {
      ...DEFAULT_SETTINGS.downloaders,
      qbittorrent: {
        baseUrl: "http://127.0.0.1:17474",
        username: "root",
        password: "secret"
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getSettingsMock.mockResolvedValue(storedSettings)
    mergeSettingsMock.mockReturnValue(sanitizedSettings)
    sanitizeSettingsMock.mockReturnValue(sanitizedSettings)
    getDownloaderAdapterMock.mockReturnValue({
      testConnection: testConnectionMock
    })
    getDownloaderMetaMock.mockReturnValue({
      id: "qbittorrent",
      displayName: "qBittorrent"
    })
    testConnectionMock.mockResolvedValue({
      baseUrl: "http://127.0.0.1:17474",
      version: "4.6.0"
    })
  })

  it("merges stored settings with overrides, sanitizes them, and uses the selected downloader adapter", async () => {
    await expect(
      testDownloaderConnection({
        downloaders: {
          ...DEFAULT_SETTINGS.downloaders,
          qbittorrent: {
            baseUrl: " http://127.0.0.1:17474/// ",
            username: " root ",
            password: "secret"
          }
        }
      })
    ).resolves.toEqual({
      downloaderId: "qbittorrent",
      displayName: "qBittorrent",
      baseUrl: "http://127.0.0.1:17474",
      version: "4.6.0"
    })

    expect(getSettingsMock).toHaveBeenCalledTimes(1)
    expect(mergeSettingsMock).toHaveBeenCalledWith(storedSettings, {
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          baseUrl: " http://127.0.0.1:17474/// ",
          username: " root ",
          password: "secret"
        }
      }
    })
    expect(sanitizeSettingsMock).toHaveBeenCalledWith(sanitizedSettings)
    expect(getDownloaderAdapterMock).toHaveBeenCalledWith("qbittorrent")
    expect(testConnectionMock).toHaveBeenCalledWith(sanitizedSettings)
  })

  it("returns adapter-provided fallback values unchanged", async () => {
    testConnectionMock.mockResolvedValueOnce({
      baseUrl: "http://127.0.0.1:17474",
      version: "unknown"
    })

    await expect(testDownloaderConnection(null)).resolves.toEqual({
      downloaderId: "qbittorrent",
      displayName: "qBittorrent",
      baseUrl: "http://127.0.0.1:17474",
      version: "unknown"
    })
  })

  it("rethrows default adapter connection failures", async () => {
    testConnectionMock.mockRejectedValueOnce(new Error("bad login"))

    await expect(testDownloaderConnection(null)).rejects.toThrow("bad login")
  })
})
