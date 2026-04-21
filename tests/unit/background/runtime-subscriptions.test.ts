import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { DEFAULT_SUBSCRIPTION_POLICY_CONFIG } from "../../../src/lib/subscriptions/policy/defaults"
import type { SubscriptionPolicyConfig } from "../../../src/lib/subscriptions/policy/types"

type AlarmListener = Parameters<typeof fakeBrowser.alarms.onAlarm.addListener>[0]
type RuntimeInstalledListener = Parameters<typeof fakeBrowser.runtime.onInstalled.addListener>[0]
type RuntimeMessageListener = Parameters<typeof fakeBrowser.runtime.onMessage.addListener>[0]
type RuntimeStartupListener = NonNullable<
  Parameters<NonNullable<typeof fakeBrowser.runtime.onStartup>["addListener"]>[0]
>
type NotificationClickedListener = Parameters<typeof fakeBrowser.notifications.onClicked.addListener>[0]
type TabsUpdatedListener = Parameters<typeof fakeBrowser.tabs.onUpdated.addListener>[0]
type TabsActivatedListener = Parameters<typeof fakeBrowser.tabs.onActivated.addListener>[0]

const {
  clearPendingSubscriptionNotificationsMock,
  deleteSubscriptionDefinitionMock,
  downloadSubscriptionHitsMock,
  executeSubscriptionScanMock,
  getSubscriptionPolicyConfigMock,
  reconcileSubscriptionAlarmMock,
  testDownloaderConnectionMock,
  upsertSubscriptionDefinitionMock
} = vi.hoisted(() => ({
  clearPendingSubscriptionNotificationsMock: vi.fn(),
  deleteSubscriptionDefinitionMock: vi.fn(),
  downloadSubscriptionHitsMock: vi.fn(),
  executeSubscriptionScanMock: vi.fn(),
  getSubscriptionPolicyConfigMock: vi.fn(),
  reconcileSubscriptionAlarmMock: vi.fn(),
  testDownloaderConnectionMock: vi.fn(),
  upsertSubscriptionDefinitionMock: vi.fn()
}))

const onAlarmAddListener = vi.fn()
const onClickedAddListener = vi.fn()
const onInstalledAddListener = vi.fn()
const onMessageAddListener = vi.fn()
const onStartupAddListener = vi.fn()
const onUpdatedAddListener = vi.fn()
const onActivatedAddListener = vi.fn()

vi.mock("../../../src/lib/background", async () => {
  const actual = await vi.importActual<typeof import("../../../src/lib/background")>(
    "../../../src/lib/background"
  )
  return {
    ...actual,
    createBatchDownloadManager: () => ({
      activeJobs: new Map<number, unknown>(),
      startBatchDownload: vi.fn()
    }),
    clearPendingSubscriptionNotifications: clearPendingSubscriptionNotificationsMock,
    deleteSubscriptionDefinition: deleteSubscriptionDefinitionMock,
    downloadSubscriptionHits: downloadSubscriptionHitsMock,
    executeSubscriptionScan: executeSubscriptionScanMock,
    reconcileSubscriptionAlarm: reconcileSubscriptionAlarmMock,
    retryFailedItems: vi.fn(),
    testDownloaderConnection: testDownloaderConnectionMock,
    upsertSubscriptionDefinition: upsertSubscriptionDefinitionMock,
    fetchTorrentForUpload: vi.fn()
  }
})

vi.mock("../../../src/lib/subscriptions/policy/storage", () => ({
  ensureSubscriptionPolicyConfig: vi.fn(),
  getSubscriptionPolicyConfig: getSubscriptionPolicyConfigMock,
  saveSubscriptionPolicyConfig: vi.fn()
}))

function createSubscriptionPolicy(overrides: Partial<SubscriptionPolicyConfig> = {}): SubscriptionPolicyConfig {
  return {
    ...DEFAULT_SUBSCRIPTION_POLICY_CONFIG,
    ...overrides
  }
}

function installBrowserSpies() {
  vi.spyOn(fakeBrowser.alarms.onAlarm, "addListener").mockImplementation((listener: AlarmListener) => {
    onAlarmAddListener(listener)
  })
  vi.spyOn(fakeBrowser.notifications.onClicked, "addListener").mockImplementation(
    (listener: NotificationClickedListener) => {
      onClickedAddListener(listener)
    }
  )
  vi.spyOn(fakeBrowser.runtime.onInstalled, "addListener").mockImplementation(
    (listener: RuntimeInstalledListener) => {
      onInstalledAddListener(listener)
    }
  )
  vi.spyOn(fakeBrowser.runtime.onMessage, "addListener").mockImplementation(
    (listener: RuntimeMessageListener) => {
      onMessageAddListener(listener)
    }
  )
  fakeBrowser.runtime.onStartup &&
    vi.spyOn(fakeBrowser.runtime.onStartup, "addListener").mockImplementation(
      (listener: RuntimeStartupListener) => {
        onStartupAddListener(listener)
      }
    )
  vi.spyOn(fakeBrowser.action, "setIcon").mockImplementation(vi.fn(() => Promise.resolve()) as never)
  vi.spyOn(fakeBrowser.tabs, "query").mockImplementation(vi.fn(async () => []) as never)
  vi.spyOn(fakeBrowser.tabs, "get").mockImplementation(
    vi.fn(async () => ({ id: 1, url: "https://example.com/" })) as never
  )
  vi.spyOn(fakeBrowser.tabs, "sendMessage").mockImplementation(vi.fn() as never)
  vi.spyOn(fakeBrowser.tabs.onUpdated, "addListener").mockImplementation(
    (listener: TabsUpdatedListener) => {
      onUpdatedAddListener(listener)
    }
  )
  vi.spyOn(fakeBrowser.tabs.onActivated, "addListener").mockImplementation(
    (listener: TabsActivatedListener) => {
      onActivatedAddListener(listener)
    }
  )
  vi.spyOn(fakeBrowser.permissions, "contains").mockImplementation(
    vi.fn(async () => true) as never
  )
  vi.spyOn(fakeBrowser.permissions, "request").mockImplementation(
    vi.fn(async () => true) as never
  )
}

describe("background runtime subscription boundary", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    getSubscriptionPolicyConfigMock.mockResolvedValue(createSubscriptionPolicy({
      enabled: true,
      notificationsEnabled: true,
      notificationDownloadActionEnabled: true
    }))
    testDownloaderConnectionMock.mockResolvedValue({
      downloaderId: "qbittorrent",
      displayName: "qBittorrent",
      baseUrl: "http://127.0.0.1:17474",
      version: "5.0.0"
    })
    installBrowserSpies()
    const { registerBackgroundRuntime } = await import("../../../src/entrypoints/background/runtime")
    registerBackgroundRuntime()
  })

  it("supports TEST_DOWNLOADER_CONNECTION runtime messages", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    const keepsPortOpen = listener?.(
      {
        type: "TEST_DOWNLOADER_CONNECTION",
        settings: {
          activeId: "qbittorrent",
          profiles: {
            qbittorrent: {
              baseUrl: "http://127.0.0.1:17474",
              username: "",
              password: ""
            },
            transmission: {
              baseUrl: "http://127.0.0.1:9091/transmission/rpc",
              username: "",
              password: ""
            }
          }
        }
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(testDownloaderConnectionMock).toHaveBeenCalledWith(
      {
        activeId: "qbittorrent",
        profiles: {
          qbittorrent: {
            baseUrl: "http://127.0.0.1:17474",
            username: "",
            password: ""
          },
          transmission: {
            baseUrl: "http://127.0.0.1:9091/transmission/rpc",
            username: "",
            password: ""
          }
        }
      }
    )
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      result: {
        downloaderId: "qbittorrent",
        displayName: "qBittorrent",
        baseUrl: "http://127.0.0.1:17474",
        version: "5.0.0"
      }
    })
  })

  it("supports UPSERT_SUBSCRIPTION runtime messages", async () => {
    upsertSubscriptionDefinitionMock.mockResolvedValue(undefined)
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()
    const subscription = {
      id: "sub-1",
      name: "ACG Medalist",
      enabled: true,
      sourceIds: ["acgrip"],
      multiSiteModeEnabled: false,
      titleQuery: "Medalist",
      subgroupQuery: "",
      advanced: {
        must: [],
        any: []
      },
      createdAt: "2026-04-14T09:30:00.000Z",
      baselineCreatedAt: "2026-04-14T09:30:00.000Z"
    }

    const keepsPortOpen = listener?.(
      {
        type: "UPSERT_SUBSCRIPTION",
        subscription
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(upsertSubscriptionDefinitionMock).toHaveBeenCalledWith(subscription)
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true
    })
  })

  it("supports DELETE_SUBSCRIPTION runtime messages", async () => {
    deleteSubscriptionDefinitionMock.mockResolvedValue(undefined)
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    const keepsPortOpen = listener?.(
      {
        type: "DELETE_SUBSCRIPTION",
        subscriptionId: "sub-1"
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(deleteSubscriptionDefinitionMock).toHaveBeenCalledWith("sub-1")
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true
    })
  })

  it("downloads subscription hits when a subscription notification is clicked and ignores other ids", async () => {
    downloadSubscriptionHitsMock.mockResolvedValue(undefined)
    const listener = onClickedAddListener.mock.calls[0]?.[0]

    listener?.("not-a-subscription-round")
    await Promise.resolve()
    expect(downloadSubscriptionHitsMock).not.toHaveBeenCalled()

    listener?.("subscription-round:20260414093000000")
    await vi.waitFor(() => {
      expect(downloadSubscriptionHitsMock).toHaveBeenCalledTimes(1)
    })
    expect(downloadSubscriptionHitsMock).toHaveBeenCalledWith({
      roundId: "subscription-round:20260414093000000"
    })
  })

  it("does not download hits from notification clicks when the click action toggle is disabled", async () => {
    getSubscriptionPolicyConfigMock.mockResolvedValue(
      createSubscriptionPolicy({
        notificationDownloadActionEnabled: false
      })
    )
    downloadSubscriptionHitsMock.mockResolvedValue(undefined)
    const listener = onClickedAddListener.mock.calls[0]?.[0]

    listener?.("subscription-round:20260414093000000")
    await Promise.resolve()

    expect(getSubscriptionPolicyConfigMock).toHaveBeenCalledTimes(1)
    expect(downloadSubscriptionHitsMock).not.toHaveBeenCalled()
  })

  it("does not download hits from notification clicks when subscriptions are globally disabled", async () => {
    getSubscriptionPolicyConfigMock.mockResolvedValue(
      createSubscriptionPolicy({
        enabled: false
      })
    )
    downloadSubscriptionHitsMock.mockResolvedValue(undefined)
    const listener = onClickedAddListener.mock.calls[0]?.[0]

    listener?.("subscription-round:20260414093000000")
    await Promise.resolve()

    expect(getSubscriptionPolicyConfigMock).toHaveBeenCalledTimes(1)
    expect(downloadSubscriptionHitsMock).not.toHaveBeenCalled()
    expect(fakeBrowser.permissions.request).not.toHaveBeenCalled()
  })

  it("does not download hits from notification clicks when notifications are globally disabled", async () => {
    getSubscriptionPolicyConfigMock.mockResolvedValue(
      createSubscriptionPolicy({
        notificationsEnabled: false
      })
    )
    downloadSubscriptionHitsMock.mockResolvedValue(undefined)
    const listener = onClickedAddListener.mock.calls[0]?.[0]

    listener?.("subscription-round:20260414093000000")
    await Promise.resolve()

    expect(getSubscriptionPolicyConfigMock).toHaveBeenCalledTimes(1)
    expect(downloadSubscriptionHitsMock).not.toHaveBeenCalled()
    expect(fakeBrowser.permissions.request).not.toHaveBeenCalled()
  })

  it("logs alarm-triggered subscription scan failures", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    executeSubscriptionScanMock.mockRejectedValue(new Error("scan failed"))
    const listener = onAlarmAddListener.mock.calls[0]?.[0]

    expect(() => {
      listener?.({
        name: "subscription-poll"
      })
    }).not.toThrow()

    await vi.waitFor(() => {
      expect(executeSubscriptionScanMock).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(
        "Subscription alarm scan failed.",
        expect.objectContaining({
          message: "scan failed"
        })
      )
    })
  })

  it("logs subscription notification click download errors", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    downloadSubscriptionHitsMock.mockRejectedValue(new Error("downloader offline"))
    const listener = onClickedAddListener.mock.calls[0]?.[0]

    expect(() => {
      listener?.("subscription-round:20260414093000000")
    }).not.toThrow()

    await vi.waitFor(() => {
      expect(downloadSubscriptionHitsMock).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledWith(
        "Subscription notification click download failed.",
        expect.objectContaining({
          message: "downloader offline"
        })
      )
    })
  })

  it("still downloads notification hits after permission prompts when extraction is needed", async () => {
    downloadSubscriptionHitsMock.mockResolvedValue(undefined)
    const listener = onClickedAddListener.mock.calls[0]?.[0]

    listener?.("subscription-round:20260414093000000")

    await vi.waitFor(() => {
      expect(downloadSubscriptionHitsMock).toHaveBeenCalledWith({
        roundId: "subscription-round:20260414093000000"
      })
    })
  })
})
