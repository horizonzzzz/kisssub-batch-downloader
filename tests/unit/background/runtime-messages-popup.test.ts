import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

type RuntimeInstalledListener = Parameters<typeof fakeBrowser.runtime.onInstalled.addListener>[0]
type RuntimeMessageListener = Parameters<typeof fakeBrowser.runtime.onMessage.addListener>[0]
type TabsUpdatedListener = Parameters<typeof fakeBrowser.tabs.onUpdated.addListener>[0]
type TabsActivatedListener = Parameters<typeof fakeBrowser.tabs.onActivated.addListener>[0]

const {
  activeJobsMock,
  buildPopupStateMock,
  notifyActiveTabOfSourceEnabledChangeMock,
  openOptionsPageForRouteMock,
  setSourceEnabledForPopupMock
} = vi.hoisted(() => ({
  activeJobsMock: new Map<number, unknown>(),
  buildPopupStateMock: vi.fn(),
  notifyActiveTabOfSourceEnabledChangeMock: vi.fn(),
  openOptionsPageForRouteMock: vi.fn(),
  setSourceEnabledForPopupMock: vi.fn()
}))

const onInstalledAddListener = vi.fn()
const onMessageAddListener = vi.fn()
const onUpdatedAddListener = vi.fn()
const onActivatedAddListener = vi.fn()
const runtimeOpenOptionsPage = vi.fn()

vi.mock("../../../src/lib/background", async () => {
  const actual = await vi.importActual<typeof import("../../../src/lib/background")>("../../../src/lib/background")
  return {
    ...actual,
    createBatchDownloadManager: () => ({
      activeJobs: activeJobsMock,
      startBatchDownload: vi.fn()
    }),
    buildPopupState: buildPopupStateMock,
    notifyActiveTabOfSourceEnabledChange: notifyActiveTabOfSourceEnabledChangeMock,
    openOptionsPageForRoute: openOptionsPageForRouteMock,
    setSourceEnabledForPopup: setSourceEnabledForPopupMock,
    fetchTorrentForUpload: vi.fn(),
    retryFailedItems: vi.fn(),
    testDownloaderConnection: vi.fn()
  }
})

function installBrowserSpies() {
  vi.spyOn(fakeBrowser.runtime.onInstalled, "addListener").mockImplementation((listener: RuntimeInstalledListener) => {
    onInstalledAddListener(listener)
  })
  vi.spyOn(fakeBrowser.runtime.onMessage, "addListener").mockImplementation((listener: RuntimeMessageListener) => {
    onMessageAddListener(listener)
  })
  vi.spyOn(fakeBrowser.runtime, "openOptionsPage").mockImplementation(runtimeOpenOptionsPage as never)
  vi.spyOn(fakeBrowser.action, "setIcon").mockImplementation(vi.fn(() => Promise.resolve()) as never)
  vi.spyOn(fakeBrowser.tabs, "query").mockImplementation(vi.fn(async () => []) as never)
  vi.spyOn(fakeBrowser.tabs, "get").mockImplementation(
    vi.fn(async () => ({ id: 1, url: "https://example.com/" })) as never
  )
  vi.spyOn(fakeBrowser.tabs.onUpdated, "addListener").mockImplementation((listener: TabsUpdatedListener) => {
    onUpdatedAddListener(listener)
  })
  vi.spyOn(fakeBrowser.tabs.onActivated, "addListener").mockImplementation((listener: TabsActivatedListener) => {
    onActivatedAddListener(listener)
  })
  vi.spyOn(fakeBrowser.tabs, "sendMessage").mockImplementation(vi.fn() as never)
}

describe("background popup runtime boundary", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    activeJobsMock.clear()
    installBrowserSpies()
    const { registerBackgroundRuntime } = await import("../../../src/entrypoints/background/runtime")
    registerBackgroundRuntime()
  })

  it("rejects OPEN_OPTIONS_PAGE when route is invalid", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    const keepsPortOpen = listener?.(
      {
        type: "OPEN_OPTIONS_PAGE",
        route: "/not-a-real-route"
      },
      {},
      sendResponse
    )

    expect(keepsPortOpen).toBe(true)
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: "Invalid OPEN_OPTIONS_PAGE route: /not-a-real-route"
    })
    expect(runtimeOpenOptionsPage).not.toHaveBeenCalled()
    expect(openOptionsPageForRouteMock).not.toHaveBeenCalled()
  })

  it("rejects SET_SOURCE_ENABLED when sourceId or enabled payload is invalid", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    listener?.(
      {
        type: "SET_SOURCE_ENABLED",
        sourceId: "not-a-source",
        enabled: true
      },
      {},
      sendResponse
    )
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })
    expect(sendResponse).toHaveBeenLastCalledWith({
      ok: false,
      error: "Invalid SET_SOURCE_ENABLED payload"
    })

    listener?.(
      {
        type: "SET_SOURCE_ENABLED",
        sourceId: "acgrip",
        enabled: "yes"
      },
      {},
      sendResponse
    )
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(2)
    })
    expect(sendResponse).toHaveBeenLastCalledWith({
      ok: false,
      error: "Invalid SET_SOURCE_ENABLED payload"
    })
    expect(setSourceEnabledForPopupMock).not.toHaveBeenCalled()
  })

  it("syncs the active tab after a valid source toggle request succeeds", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    setSourceEnabledForPopupMock.mockResolvedValue({
      kisssub: {
        enabled: false,
        deliveryMode: "magnet",
        script: {
          url: "//1.acgscript.com/script/miobt/4.js?3",
          revision: "20181120.2"
        }
      },
      dongmanhuayuan: {
        enabled: true,
        deliveryMode: "magnet"
      },
      acgrip: {
        enabled: true,
        deliveryMode: "torrent-file"
      },
      bangumimoe: {
        enabled: true,
        deliveryMode: "magnet"
      }
    })
    notifyActiveTabOfSourceEnabledChangeMock.mockResolvedValue(undefined)

    listener?.(
      {
        type: "SET_SOURCE_ENABLED",
        sourceId: "kisssub",
        enabled: false
      },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })

    expect(setSourceEnabledForPopupMock).toHaveBeenCalledWith("kisssub", false)
    expect(notifyActiveTabOfSourceEnabledChangeMock).toHaveBeenCalledWith("kisssub", false)
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      sourceId: "kisssub",
      enabled: false
    })
  })

  it("rejects disabling a source when any running tab is already downloading from that source", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    activeJobsMock.set(99, {})
    ;(globalThis.chrome.tabs.get as any).mockImplementation(async (tabId: number) => {
      if (tabId === 99) {
        return {
          id: 99,
          url: "https://kisssub.org/list"
        }
      }

      return {
        id: tabId,
        url: "https://example.com/"
      }
    })

    listener?.(
      {
        type: "SET_SOURCE_ENABLED",
        sourceId: "kisssub",
        enabled: false
      },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })

    expect(setSourceEnabledForPopupMock).not.toHaveBeenCalled()
    expect(notifyActiveTabOfSourceEnabledChangeMock).not.toHaveBeenCalled()
    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      error: "当前页面正在执行批量下载，暂时不能禁用该站点。"
    })
  })
})
