import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

type RuntimeMessageListener = Parameters<typeof fakeBrowser.runtime.onMessage.addListener>[0]

const {
  activeJobsMock,
  buildPopupStateMock,
  notifyActiveTabOfSourceEnabledChangeMock,
  openOptionsPageForRouteMock,
  getSourceConfigMock,
  saveSourceConfigMock,
  setSourceEnabledForPopupMock
} = vi.hoisted(() => ({
  activeJobsMock: new Map<number, unknown>(),
  buildPopupStateMock: vi.fn(),
  notifyActiveTabOfSourceEnabledChangeMock: vi.fn(),
  openOptionsPageForRouteMock: vi.fn(),
  getSourceConfigMock: vi.fn(),
  saveSourceConfigMock: vi.fn(),
  setSourceEnabledForPopupMock: vi.fn()
}))

const onMessageAddListener = vi.fn()

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

vi.mock("../../../src/lib/sources/config/storage", () => ({
  getSourceConfig: getSourceConfigMock,
  saveSourceConfig: saveSourceConfigMock
}))

function installBrowserSpies() {
  vi.spyOn(fakeBrowser.runtime.onMessage, "addListener").mockImplementation((listener: RuntimeMessageListener) => {
    onMessageAddListener(listener)
  })
  vi.spyOn(fakeBrowser.runtime, "openOptionsPage").mockImplementation(vi.fn() as never)
  vi.spyOn(fakeBrowser.action, "setIcon").mockImplementation(vi.fn(() => Promise.resolve()) as never)
  vi.spyOn(fakeBrowser.tabs, "query").mockImplementation(vi.fn(async () => []) as never)
  vi.spyOn(fakeBrowser.tabs, "get").mockImplementation(
    vi.fn(async () => ({ id: 1, url: "https://example.com/" })) as never
  )
  vi.spyOn(fakeBrowser.tabs.onUpdated, "addListener").mockImplementation(vi.fn() as never)
  vi.spyOn(fakeBrowser.tabs.onActivated, "addListener").mockImplementation(vi.fn() as never)
  vi.spyOn(fakeBrowser.tabs, "sendMessage").mockImplementation(vi.fn() as never)
}

describe("background source config runtime boundary", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    activeJobsMock.clear()
    installBrowserSpies()
    const { registerBackgroundRuntime } = await import("../../../src/entrypoints/background/runtime")
    registerBackgroundRuntime()
  })

  it("saves source config and keeps popup source toggles working", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    saveSourceConfigMock.mockResolvedValue({
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

    listener?.(
      {
        type: "SAVE_SOURCE_CONFIG",
        config: {
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
        }
      },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })

    expect(saveSourceConfigMock).toHaveBeenCalledWith({
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

    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      config: {
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
      }
    })
  })

  it("returns source config for GET_SOURCE_CONFIG request", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    getSourceConfigMock.mockResolvedValue({
      kisssub: {
        enabled: true,
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

    listener?.(
      {
        type: "GET_SOURCE_CONFIG"
      },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })

    expect(getSourceConfigMock).toHaveBeenCalledTimes(1)
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      config: {
        kisssub: {
          enabled: true,
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
      }
    })
  })
})