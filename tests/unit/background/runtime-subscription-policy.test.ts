import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { DEFAULT_SETTINGS } from "../../../src/lib/settings/defaults"
import type { AppSettings } from "../../../src/lib/shared/types"

type RuntimeMessageListener = Parameters<typeof fakeBrowser.runtime.onMessage.addListener>[0]

const {
  clearPendingSubscriptionNotificationsMock,
  getSubscriptionPolicyConfigMock,
  reconcileSubscriptionAlarmMock,
  saveSubscriptionPolicyConfigMock
} = vi.hoisted(() => ({
  clearPendingSubscriptionNotificationsMock: vi.fn(),
  getSubscriptionPolicyConfigMock: vi.fn(),
  reconcileSubscriptionAlarmMock: vi.fn(),
  saveSubscriptionPolicyConfigMock: vi.fn()
}))

const onMessageAddListener = vi.fn()

vi.mock("../../../src/lib/background", async () => {
  const actual = await vi.importActual<typeof import("../../../src/lib/background")>(
    "../../../src/lib/background"
  )
  return {
    ...actual,
    clearPendingSubscriptionNotifications: clearPendingSubscriptionNotificationsMock,
    createBatchDownloadManager: () => ({
      activeJobs: new Map<number, unknown>(),
      startBatchDownload: vi.fn()
    }),
    reconcileSubscriptionAlarm: reconcileSubscriptionAlarmMock,
    retryFailedItems: vi.fn()
  }
})

vi.mock("../../../src/lib/subscriptions/policy/storage", () => ({
  ensureSubscriptionPolicyConfig: vi.fn(),
  getSubscriptionPolicyConfig: getSubscriptionPolicyConfigMock,
  saveSubscriptionPolicyConfig: saveSubscriptionPolicyConfigMock
}))

vi.mock("../../../src/lib/settings", async () => {
  const actual = await vi.importActual<typeof import("../../../src/lib/settings")>(
    "../../../src/lib/settings"
  )
  return {
    ...actual,
    getSettings: vi.fn(async () => createAppSettings()),
    saveSettings: vi.fn(async (settings: Partial<AppSettings>) => createAppSettings(settings))
  }
})

function createAppSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    downloaders: {
      ...DEFAULT_SETTINGS.downloaders,
      qbittorrent: {
        baseUrl: "http://127.0.0.1:17474",
        username: "admin",
        password: "secret"
      }
    },
    ...overrides
  }
}

function installBrowserSpies() {
  vi.spyOn(fakeBrowser.alarms.onAlarm, "addListener").mockImplementation(vi.fn())
  vi.spyOn(fakeBrowser.notifications.onClicked, "addListener").mockImplementation(vi.fn())
  vi.spyOn(fakeBrowser.runtime.onInstalled, "addListener").mockImplementation(vi.fn())
  vi.spyOn(fakeBrowser.runtime.onMessage, "addListener").mockImplementation(
    (listener: RuntimeMessageListener) => {
      onMessageAddListener(listener)
    }
  )
  fakeBrowser.runtime.onStartup &&
    vi.spyOn(fakeBrowser.runtime.onStartup, "addListener").mockImplementation(vi.fn())
  vi.spyOn(fakeBrowser.action, "setIcon").mockImplementation(vi.fn(() => Promise.resolve()) as never)
  vi.spyOn(fakeBrowser.tabs, "query").mockImplementation(vi.fn(async () => []) as never)
  vi.spyOn(fakeBrowser.tabs, "get").mockImplementation(
    vi.fn(async () => ({ id: 1, url: "https://example.com/" })) as never
  )
  vi.spyOn(fakeBrowser.tabs, "sendMessage").mockImplementation(vi.fn() as never)
  vi.spyOn(fakeBrowser.tabs.onUpdated, "addListener").mockImplementation(vi.fn())
  vi.spyOn(fakeBrowser.tabs.onActivated, "addListener").mockImplementation(vi.fn())
  vi.spyOn(fakeBrowser.permissions, "contains").mockImplementation(
    vi.fn(async () => true) as never
  )
  vi.spyOn(fakeBrowser.permissions, "request").mockImplementation(
    vi.fn(async () => true) as never
  )
}

describe("background runtime subscription policy handlers", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    const { resetContentScriptReadyRegistry } = await import("../../../src/lib/subscriptions/content-ready")
    resetContentScriptReadyRegistry()
    getSubscriptionPolicyConfigMock.mockResolvedValue({
      enabled: false,
      pollingIntervalMinutes: 30,
      notificationsEnabled: true,
      notificationDownloadActionEnabled: true
    })
    saveSubscriptionPolicyConfigMock.mockImplementation(async (config) => config)
    installBrowserSpies()
    const { registerBackgroundRuntime } = await import("../../../src/entrypoints/background/runtime")
    registerBackgroundRuntime()
  })

  it("supports GET_SUBSCRIPTION_POLICY runtime messages", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()
    const policyConfig = {
      enabled: true,
      pollingIntervalMinutes: 15,
      notificationsEnabled: true,
      notificationDownloadActionEnabled: false
    }
    getSubscriptionPolicyConfigMock.mockResolvedValueOnce(policyConfig)

    const keepsPortOpen = listener?.(
      {
        type: "GET_SUBSCRIPTION_POLICY"
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(getSubscriptionPolicyConfigMock).toHaveBeenCalledTimes(1)
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      config: policyConfig
    })
  })

  it("saves subscription policy and reconciles alarms", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()
    const newConfig = {
      enabled: true,
      pollingIntervalMinutes: 30,
      notificationsEnabled: true,
      notificationDownloadActionEnabled: true
    }
    saveSubscriptionPolicyConfigMock.mockResolvedValueOnce(newConfig)

    const keepsPortOpen = listener?.(
      {
        type: "SAVE_SUBSCRIPTION_POLICY",
        config: newConfig
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(saveSubscriptionPolicyConfigMock).toHaveBeenCalledWith(newConfig)
    expect(reconcileSubscriptionAlarmMock).toHaveBeenCalledTimes(1)
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      config: newConfig
    })
  })

  it("clears pending notifications when policy is disabled", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()
    const previousConfig = {
      enabled: true,
      pollingIntervalMinutes: 30,
      notificationsEnabled: true,
      notificationDownloadActionEnabled: true
    }
    const newConfig = {
      enabled: false,
      pollingIntervalMinutes: 30,
      notificationsEnabled: true,
      notificationDownloadActionEnabled: true
    }
    getSubscriptionPolicyConfigMock.mockResolvedValueOnce(previousConfig)
    saveSubscriptionPolicyConfigMock.mockResolvedValueOnce(newConfig)

    const keepsPortOpen = listener?.(
      {
        type: "SAVE_SUBSCRIPTION_POLICY",
        config: newConfig
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(clearPendingSubscriptionNotificationsMock).toHaveBeenCalledTimes(1)
  })

  it("clears pending notifications when notifications are disabled", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()
    const previousConfig = {
      enabled: true,
      pollingIntervalMinutes: 30,
      notificationsEnabled: true,
      notificationDownloadActionEnabled: true
    }
    const newConfig = {
      enabled: true,
      pollingIntervalMinutes: 30,
      notificationsEnabled: false,
      notificationDownloadActionEnabled: true
    }
    getSubscriptionPolicyConfigMock.mockResolvedValueOnce(previousConfig)
    saveSubscriptionPolicyConfigMock.mockResolvedValueOnce(newConfig)

    const keepsPortOpen = listener?.(
      {
        type: "SAVE_SUBSCRIPTION_POLICY",
        config: newConfig
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(clearPendingSubscriptionNotificationsMock).toHaveBeenCalledTimes(1)
  })

  it("does not clear notifications when policy stays enabled with notifications enabled", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()
    const previousConfig = {
      enabled: true,
      pollingIntervalMinutes: 30,
      notificationsEnabled: true,
      notificationDownloadActionEnabled: false
    }
    const newConfig = {
      enabled: true,
      pollingIntervalMinutes: 45,
      notificationsEnabled: true,
      notificationDownloadActionEnabled: true
    }
    getSubscriptionPolicyConfigMock.mockResolvedValueOnce(previousConfig)
    saveSubscriptionPolicyConfigMock.mockResolvedValueOnce(newConfig)

    const keepsPortOpen = listener?.(
      {
        type: "SAVE_SUBSCRIPTION_POLICY",
        config: newConfig
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(clearPendingSubscriptionNotificationsMock).not.toHaveBeenCalled()
  })
})