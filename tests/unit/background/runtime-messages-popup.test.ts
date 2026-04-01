import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  buildPopupStateMock,
  notifyActiveTabOfSourceEnabledChangeMock,
  openOptionsPageForRouteMock,
  setSourceEnabledForPopupMock
} = vi.hoisted(() => ({
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

vi.mock("../../../lib/background", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/background")>("../../../lib/background")
  return {
    ...actual,
    createBatchDownloadManager: () => ({
      startBatchDownload: vi.fn()
    }),
    buildPopupState: buildPopupStateMock,
    notifyActiveTabOfSourceEnabledChange: notifyActiveTabOfSourceEnabledChangeMock,
    openOptionsPageForRoute: openOptionsPageForRouteMock,
    setSourceEnabledForPopup: setSourceEnabledForPopupMock,
    fetchTorrentForUpload: vi.fn(),
    retryFailedItems: vi.fn(),
    testQbConnection: vi.fn()
  }
})

function installChromeMock() {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        onInstalled: {
          addListener: onInstalledAddListener
        },
        onMessage: {
          addListener: onMessageAddListener
        },
        openOptionsPage: runtimeOpenOptionsPage
      },
      action: {
        setIcon: vi.fn(() => Promise.resolve())
      },
      tabs: {
        query: vi.fn(async () => []),
        get: vi.fn(async () => ({ id: 1, url: "https://example.com/" })),
        onUpdated: {
          addListener: onUpdatedAddListener
        },
        onActivated: {
          addListener: onActivatedAddListener
        },
        sendMessage: vi.fn()
      }
    }
  })
}

describe("background popup runtime boundary", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.clearAllMocks()
    installChromeMock()
    await import("../../../background")
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
      enabledSources: {
        kisssub: false
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
      settings: {
        enabledSources: {
          kisssub: false
        }
      }
    })
  })
})
