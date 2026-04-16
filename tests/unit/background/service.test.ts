import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "../../../src/lib/settings/defaults"
import type { Settings } from "../../../src/lib/shared/types"

const {
  getSettingsMock,
  mergeSettingsMock,
  sanitizeSettingsMock,
  getDownloaderAdapterMock,
  getDownloaderMetaMock,
  testConnectionMock,
  permissionsContainsMock,
  permissionsRequestMock
} = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
  mergeSettingsMock: vi.fn(),
  sanitizeSettingsMock: vi.fn(),
  getDownloaderAdapterMock: vi.fn(),
  getDownloaderMetaMock: vi.fn(),
  testConnectionMock: vi.fn(),
  permissionsContainsMock: vi.fn(),
  permissionsRequestMock: vi.fn()
}))

vi.mock("../../../src/lib/settings", async () => {
  const actual = await vi.importActual<typeof import("../../../src/lib/settings")>(
    "../../../src/lib/settings"
  )

  return {
    ...actual,
    getSettings: getSettingsMock,
    mergeSettings: mergeSettingsMock,
    sanitizeSettings: sanitizeSettingsMock
  }
})

vi.mock("../../../src/lib/downloader", () => ({
  getDownloaderAdapter: getDownloaderAdapterMock,
  getDownloaderMeta: getDownloaderMetaMock
}))

vi.mock("../../../src/lib/shared/browser", async () => {
  const actual = await vi.importActual<typeof import("../../../src/lib/shared/browser")>(
    "../../../src/lib/shared/browser"
  )

  return {
    ...actual,
    getBrowser: vi.fn(() => ({
      permissions: {
        contains: permissionsContainsMock,
        request: permissionsRequestMock
      }
    }))
  }
})

import { testDownloaderConnection } from "../../../src/lib/background/service"

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
    permissionsContainsMock.mockResolvedValue(true)
    permissionsRequestMock.mockResolvedValue(true)
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
    expect(permissionsContainsMock).toHaveBeenCalledWith({
      origins: ["http://127.0.0.1/*"]
    })
    expect(permissionsRequestMock).not.toHaveBeenCalled()
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

  it("fails with a permission-specific error when downloader host access is missing", async () => {
    permissionsContainsMock.mockResolvedValueOnce(false)

    await expect(testDownloaderConnection(null)).rejects.toThrow("权限")
    expect(permissionsRequestMock).not.toHaveBeenCalled()
    expect(testConnectionMock).not.toHaveBeenCalled()
  })

  it("fails with a permission-specific error when downloader host access is denied", async () => {
    permissionsContainsMock.mockResolvedValueOnce(false)
    permissionsRequestMock.mockResolvedValueOnce(false)

    await expect(testDownloaderConnection(null)).rejects.toThrow("权限")
    expect(testConnectionMock).not.toHaveBeenCalled()
  })
})
