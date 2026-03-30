import { beforeEach, describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "../../../lib/settings/defaults"
import type { Settings } from "../../../lib/shared/types"

const {
  getSettingsMock,
  sanitizeSettingsMock,
  loginQbMock,
  qbFetchTextMock
} = vi.hoisted(() => ({
  getSettingsMock: vi.fn(),
  sanitizeSettingsMock: vi.fn(),
  loginQbMock: vi.fn(),
  qbFetchTextMock: vi.fn()
}))

vi.mock("../../../lib/settings", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/settings")>(
    "../../../lib/settings"
  )

  return {
    ...actual,
    getSettings: getSettingsMock,
    sanitizeSettings: sanitizeSettingsMock
  }
})

vi.mock("../../../lib/downloader/qb", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/downloader/qb")>(
    "../../../lib/downloader/qb"
  )

  return {
    ...actual,
    loginQb: loginQbMock,
    qbFetchText: qbFetchTextMock
  }
})

import { testQbConnection } from "../../../lib/background/service"

describe("testQbConnection", () => {
  const storedSettings: Settings = {
    ...DEFAULT_SETTINGS,
    qbBaseUrl: "http://127.0.0.1:7474",
    qbUsername: "admin",
    qbPassword: "secret"
  }

  const sanitizedSettings: Settings = {
    ...storedSettings,
    qbBaseUrl: "http://127.0.0.1:17474",
    qbUsername: "root"
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getSettingsMock.mockResolvedValue(storedSettings)
    sanitizeSettingsMock.mockReturnValue(sanitizedSettings)
    loginQbMock.mockResolvedValue(undefined)
    qbFetchTextMock.mockResolvedValue(" 4.6.0 \n")
  })

  it("merges stored settings with overrides, sanitizes them, and fetches the qB version", async () => {
    await expect(
      testQbConnection({
        qbBaseUrl: " http://127.0.0.1:17474/// ",
        qbUsername: " root "
      })
    ).resolves.toEqual({
      baseUrl: "http://127.0.0.1:17474",
      version: "4.6.0"
    })

    expect(getSettingsMock).toHaveBeenCalledTimes(1)
    expect(sanitizeSettingsMock).toHaveBeenCalledWith({
      ...storedSettings,
      qbBaseUrl: " http://127.0.0.1:17474/// ",
      qbUsername: " root "
    })
    expect(loginQbMock).toHaveBeenCalledWith(sanitizedSettings)
    expect(qbFetchTextMock).toHaveBeenCalledWith(sanitizedSettings, "/api/v2/app/version", {
      method: "GET"
    })
    expect(loginQbMock.mock.invocationCallOrder[0]).toBeLessThan(
      qbFetchTextMock.mock.invocationCallOrder[0]
    )
  })

  it("falls back to unknown when the version response is blank", async () => {
    qbFetchTextMock.mockResolvedValueOnce("   ")

    await expect(testQbConnection(null)).resolves.toEqual({
      baseUrl: "http://127.0.0.1:17474",
      version: "unknown"
    })
  })

  it("rethrows qb login failures", async () => {
    loginQbMock.mockRejectedValueOnce(new Error("bad login"))

    await expect(testQbConnection(null)).rejects.toThrow("bad login")
    expect(qbFetchTextMock).not.toHaveBeenCalled()
  })

  it("rethrows version lookup failures after logging in", async () => {
    qbFetchTextMock.mockRejectedValueOnce(new Error("version endpoint failed"))

    await expect(testQbConnection(null)).rejects.toThrow("version endpoint failed")
    expect(loginQbMock).toHaveBeenCalledTimes(1)
  })
})
