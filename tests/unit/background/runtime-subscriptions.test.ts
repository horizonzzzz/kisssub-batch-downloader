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
  createSubscriptionCommandMock,
  deleteSubscriptionDefinitionMock,
  downloadSubscriptionHitsMock,
  executeSubscriptionScanMock,
  getSubscriptionPolicyConfigMock,
  reconcileSubscriptionAlarmMock,
  setSubscriptionEnabledCommandMock,
  testDownloaderConnectionMock
} = vi.hoisted(() => ({
  clearPendingSubscriptionNotificationsMock: vi.fn(),
  createSubscriptionCommandMock: vi.fn(),
  deleteSubscriptionDefinitionMock: vi.fn(),
  downloadSubscriptionHitsMock: vi.fn(),
  executeSubscriptionScanMock: vi.fn(),
  getSubscriptionPolicyConfigMock: vi.fn(),
  reconcileSubscriptionAlarmMock: vi.fn(),
  setSubscriptionEnabledCommandMock: vi.fn(),
  testDownloaderConnectionMock: vi.fn()
}))

const onAlarmAddListener = vi.fn()
const onClickedAddListener = vi.fn()
const onInstalledAddListener = vi.fn()
const onMessageAddListener = vi.fn()
const onStartupAddListener = vi.fn()
const onUpdatedAddListener = vi.fn()
const onActivatedAddListener = vi.fn()
const tabsUpdateMock = vi.fn()
const tabsCreateMock = vi.fn()
const windowsUpdateMock = vi.fn()

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
    createSubscriptionCommand: createSubscriptionCommandMock,
    deleteSubscriptionDefinition: deleteSubscriptionDefinitionMock,
    downloadSubscriptionHits: downloadSubscriptionHitsMock,
    executeSubscriptionScan: executeSubscriptionScanMock,
    reconcileSubscriptionAlarm: reconcileSubscriptionAlarmMock,
    retryFailedItems: vi.fn(),
    setSubscriptionEnabledCommand: setSubscriptionEnabledCommandMock,
    testDownloaderConnection: testDownloaderConnectionMock,
    fetchTorrentForUpload: vi.fn(),
    openOptionsPageAtTarget: vi.fn(async (target: string) => {
      const optionsUrl = `chrome-extension://test-extension-id/options.html#${target}`
      const existingTabs = await fakeBrowser.tabs.query({ url: "chrome-extension://test-extension-id/options.html*" })
      if (existingTabs.length > 0 && typeof existingTabs[0].id === "number") {
        await tabsUpdateMock(existingTabs[0].id, { url: optionsUrl, active: true })
        if (typeof existingTabs[0].windowId === "number") {
          await windowsUpdateMock(existingTabs[0].windowId, { focused: true })
        }
      } else {
        await tabsCreateMock({ url: optionsUrl })
      }
    })
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
  tabsUpdateMock.mockImplementation(vi.fn(async () => {}) as never)
  tabsCreateMock.mockImplementation(vi.fn(async () => {}) as never)
  windowsUpdateMock.mockImplementation(vi.fn(async () => {}) as never)
}

describe("background runtime subscription boundary", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    getSubscriptionPolicyConfigMock.mockResolvedValue(createSubscriptionPolicy({
      enabled: true,
      notificationsEnabled: true
    }))
    testDownloaderConnectionMock.mockResolvedValue({
      downloaderId: "qbittorrent",
      displayName: "qBittorrent",
      baseUrl: "http://127.0.0.1:17474",
      version: "5.0.0"
    })
    tabsUpdateMock.mockClear()
    tabsCreateMock.mockClear()
    windowsUpdateMock.mockClear()
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

  it("supports CREATE_SUBSCRIPTION runtime messages", async () => {
    createSubscriptionCommandMock.mockResolvedValue(undefined)
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
      baselineCreatedAt: "2026-04-14T09:30:00.000Z",
      deletedAt: null
    }

    const keepsPortOpen = listener?.(
      {
        type: "CREATE_SUBSCRIPTION",
        subscription
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(createSubscriptionCommandMock).toHaveBeenCalledWith(subscription)
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true
    })
  })

  it("rejects malformed CREATE_SUBSCRIPTION runtime payloads", async () => {
    createSubscriptionCommandMock.mockResolvedValue(undefined)
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    const keepsPortOpen = listener?.(
      {
        type: "CREATE_SUBSCRIPTION",
        subscription: {
          id: "",
          name: "Incomplete",
          enabled: "yes",
          sourceIds: [],
          titleQuery: "Medalist",
          subgroupQuery: "",
          advanced: {
            must: [],
            any: []
          },
          createdAt: "2026-04-14T09:30:00.000Z",
          baselineCreatedAt: "2026-04-14T09:30:00.000Z",
          deletedAt: null
        }
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(createSubscriptionCommandMock).not.toHaveBeenCalled()
    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: "Invalid CREATE_SUBSCRIPTION payload"
    })
  })

  it("rejects CREATE_SUBSCRIPTION payloads with invalid sourceIds entries", async () => {
    createSubscriptionCommandMock.mockResolvedValue(undefined)
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    const keepsPortOpen = listener?.(
      {
        type: "CREATE_SUBSCRIPTION",
        subscription: {
          id: "sub-1",
          name: "Invalid source",
          enabled: true,
          sourceIds: ["acgrip", "not-a-source"],
          multiSiteModeEnabled: false,
          titleQuery: "Medalist",
          subgroupQuery: "",
          advanced: {
            must: [],
            any: []
          },
          createdAt: "2026-04-14T09:30:00.000Z",
          baselineCreatedAt: "2026-04-14T09:30:00.000Z",
          deletedAt: null
        }
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(createSubscriptionCommandMock).not.toHaveBeenCalled()
    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: "Invalid CREATE_SUBSCRIPTION payload"
    })
  })

  it("rejects CREATE_SUBSCRIPTION payloads with non-boolean multiSiteModeEnabled", async () => {
    createSubscriptionCommandMock.mockResolvedValue(undefined)
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    const keepsPortOpen = listener?.(
      {
        type: "CREATE_SUBSCRIPTION",
        subscription: {
          id: "sub-1",
          name: "Missing multi-site mode",
          enabled: true,
          sourceIds: ["acgrip"],
          titleQuery: "Medalist",
          subgroupQuery: "",
          advanced: {
            must: [],
            any: []
          },
          createdAt: "2026-04-14T09:30:00.000Z",
          baselineCreatedAt: "2026-04-14T09:30:00.000Z",
          deletedAt: null
        }
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(createSubscriptionCommandMock).not.toHaveBeenCalled()
    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: "Invalid CREATE_SUBSCRIPTION payload"
    })
  })

  it("rejects CREATE_SUBSCRIPTION payloads with malformed advanced conditions", async () => {
    createSubscriptionCommandMock.mockResolvedValue(undefined)
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    const keepsPortOpen = listener?.(
      {
        type: "CREATE_SUBSCRIPTION",
        subscription: {
          id: "sub-1",
          name: "Bad conditions",
          enabled: true,
          sourceIds: ["acgrip"],
          multiSiteModeEnabled: false,
          titleQuery: "Medalist",
          subgroupQuery: "",
          advanced: {
            must: [
              {
                id: "cond-1",
                field: "source",
                operator: "equals",
                value: "acgrip"
              }
            ],
            any: []
          },
          createdAt: "2026-04-14T09:30:00.000Z",
          baselineCreatedAt: "2026-04-14T09:30:00.000Z",
          deletedAt: null
        }
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(createSubscriptionCommandMock).not.toHaveBeenCalled()
    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: "Invalid CREATE_SUBSCRIPTION payload"
    })
  })

  it("supports SET_SUBSCRIPTION_ENABLED runtime messages", async () => {
    setSubscriptionEnabledCommandMock.mockResolvedValue(undefined)
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    const keepsPortOpen = listener?.(
      {
        type: "SET_SUBSCRIPTION_ENABLED",
        subscriptionId: "sub-1",
        enabled: false
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(setSubscriptionEnabledCommandMock).toHaveBeenCalledWith("sub-1", false)
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true
    })
  })

  it("rejects malformed SET_SUBSCRIPTION_ENABLED runtime payloads", async () => {
    setSubscriptionEnabledCommandMock.mockResolvedValue(undefined)
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    const keepsPortOpen = listener?.(
      {
        type: "SET_SUBSCRIPTION_ENABLED",
        subscriptionId: "sub-1",
        enabled: "false"
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(setSubscriptionEnabledCommandMock).not.toHaveBeenCalled()
    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: "Invalid SET_SUBSCRIPTION_ENABLED payload"
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

  it("navigates to subscription hits workbench when a subscription notification is clicked and ignores other ids", async () => {
    const listener = onClickedAddListener.mock.calls[0]?.[0]

    listener?.("not-a-subscription-round")
    await Promise.resolve()
    expect(tabsCreateMock).not.toHaveBeenCalled()
    expect(tabsUpdateMock).not.toHaveBeenCalled()

    listener?.("subscription-round:20260414093000000")
    await vi.waitFor(() => {
      expect(tabsCreateMock).toHaveBeenCalledTimes(1)
    })
    expect(tabsCreateMock).toHaveBeenCalledWith({
      url: "chrome-extension://test-extension-id/options.html#/subscription-hits?round=subscription-round%3A20260414093000000"
    })
    expect(downloadSubscriptionHitsMock).not.toHaveBeenCalled()
  })

  it("does not request downloader permission when notification is clicked", async () => {
    const listener = onClickedAddListener.mock.calls[0]?.[0]

    listener?.("subscription-round:20260414093000000")
    await Promise.resolve()

    expect(fakeBrowser.permissions.request).not.toHaveBeenCalled()
  })

  it("does not call download service when notification is clicked", async () => {
    const listener = onClickedAddListener.mock.calls[0]?.[0]

    listener?.("subscription-round:20260414093000000")
    await Promise.resolve()

    expect(downloadSubscriptionHitsMock).not.toHaveBeenCalled()
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

  it("logs subscription notification click navigation errors", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    tabsCreateMock.mockRejectedValue(new Error("tab creation failed"))
    const listener = onClickedAddListener.mock.calls[0]?.[0]

    expect(() => {
      listener?.("subscription-round:20260414093000000")
    }).not.toThrow()

    await vi.waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(
        "Subscription notification click navigation failed.",
        expect.objectContaining({
          message: "tab creation failed"
        })
      )
    })
  })

  it("focuses existing options tab instead of creating new one when options page is already open", async () => {
    vi.spyOn(fakeBrowser.tabs, "query").mockImplementation(
      vi.fn(async () => [{ id: 123, windowId: 456, url: "chrome-extension://test-extension-id/options.html#/general" }]) as never
    )
    const listener = onClickedAddListener.mock.calls[0]?.[0]

    listener?.("subscription-round:20260414093000000")
    await vi.waitFor(() => {
      expect(tabsUpdateMock).toHaveBeenCalledTimes(1)
    })
    expect(tabsUpdateMock).toHaveBeenCalledWith(123, {
      url: "chrome-extension://test-extension-id/options.html#/subscription-hits?round=subscription-round%3A20260414093000000",
      active: true
    })
    expect(windowsUpdateMock).toHaveBeenCalledWith(456, { focused: true })
    expect(tabsCreateMock).not.toHaveBeenCalled()
  })
})
