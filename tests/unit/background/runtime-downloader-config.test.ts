import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

type RuntimeMessageListener = Parameters<typeof fakeBrowser.runtime.onMessage.addListener>[0]

const {
  activeJobsMock,
  buildPopupStateMock,
  openOptionsPageForRouteMock,
  getDownloaderConfigMock,
  saveGeneralSettingsMock,
  saveDownloaderConfigMock,
  setSourceEnabledForPopupMock
} = vi.hoisted(() => ({
  activeJobsMock: new Map<number, unknown>(),
  buildPopupStateMock: vi.fn(),
  openOptionsPageForRouteMock: vi.fn(),
  getDownloaderConfigMock: vi.fn(),
  saveGeneralSettingsMock: vi.fn(),
  saveDownloaderConfigMock: vi.fn(),
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
    openOptionsPageForRoute: openOptionsPageForRouteMock,
    setSourceEnabledForPopup: setSourceEnabledForPopupMock,
    saveGeneralSettings: saveGeneralSettingsMock,
    fetchTorrentForUpload: vi.fn(),
    retryFailedItems: vi.fn(),
    testDownloaderConnection: vi.fn()
  }
})

vi.mock("../../../src/lib/downloader/config/storage", () => ({
  getDownloaderConfig: getDownloaderConfigMock,
  saveDownloaderConfig: saveDownloaderConfigMock
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

describe("background downloader config runtime boundary", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    activeJobsMock.clear()
    installBrowserSpies()
    const { registerBackgroundRuntime } = await import("../../../src/entrypoints/background/runtime")
    registerBackgroundRuntime()
  })

  it("returns downloader config for GET_DOWNLOADER_CONFIG request", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    getDownloaderConfigMock.mockResolvedValue({
      activeId: "qbittorrent",
      profiles: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: "secret"
        },
        transmission: {
          baseUrl: "http://127.0.0.1:9091/transmission/rpc",
          username: "",
          password: ""
        }
      }
    })

    listener?.(
      {
        type: "GET_DOWNLOADER_CONFIG"
      },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })

    expect(getDownloaderConfigMock).toHaveBeenCalledTimes(1)
    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      config: {
        activeId: "qbittorrent",
        profiles: {
          qbittorrent: {
            baseUrl: "http://127.0.0.1:17474",
            username: "admin",
            password: "secret"
          },
          transmission: {
            baseUrl: "http://127.0.0.1:9091/transmission/rpc",
            username: "",
            password: ""
          }
        }
      }
    })
  })

  it("saves downloader config and returns the sanitized result", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    saveDownloaderConfigMock.mockResolvedValue({
      activeId: "transmission",
      profiles: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: "secret"
        },
        transmission: {
          baseUrl: "http://192.168.1.50:9091/transmission/rpc",
          username: "operator",
          password: "transpass"
        }
      }
    })

    listener?.(
      {
        type: "SAVE_DOWNLOADER_CONFIG",
        config: {
          activeId: "transmission",
          profiles: {
            qbittorrent: {
              baseUrl: "http://127.0.0.1:17474",
              username: "admin",
              password: "secret"
            },
            transmission: {
              baseUrl: "http://192.168.1.50:9091/transmission/rpc",
              username: "operator",
              password: "transpass"
            }
          }
        }
      },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })

    expect(saveDownloaderConfigMock).toHaveBeenCalledWith({
      activeId: "transmission",
      profiles: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: "secret"
        },
        transmission: {
          baseUrl: "http://192.168.1.50:9091/transmission/rpc",
          username: "operator",
          password: "transpass"
        }
      }
    })

    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      config: {
        activeId: "transmission",
        profiles: {
          qbittorrent: {
            baseUrl: "http://127.0.0.1:17474",
            username: "admin",
            password: "secret"
          },
          transmission: {
            baseUrl: "http://192.168.1.50:9091/transmission/rpc",
            username: "operator",
            password: "transpass"
          }
        }
      }
    })
  })

  it("routes unified general-settings saves through the background helper", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    saveGeneralSettingsMock.mockResolvedValue({
      downloaderConfig: {
        activeId: "qbittorrent",
        profiles: {
          qbittorrent: {
            baseUrl: "http://127.0.0.1:17474",
            username: "admin",
            password: "secret"
          },
          transmission: {
            baseUrl: "http://127.0.0.1:9091/transmission/rpc",
            username: "",
            password: ""
          }
        }
      },
      batchExecutionConfig: {
        concurrency: 5,
        retryCount: 4,
        injectTimeoutMs: 25000,
        domSettleMs: 900
      }
    })

    listener?.(
      {
        type: "SAVE_GENERAL_SETTINGS",
        downloaderConfig: {
          activeId: "qbittorrent",
          profiles: {
            qbittorrent: {
              baseUrl: "http://127.0.0.1:17474",
              username: "admin",
              password: "secret"
            },
            transmission: {
              baseUrl: "http://127.0.0.1:9091/transmission/rpc",
              username: "",
              password: ""
            }
          }
        },
        batchExecutionConfig: {
          concurrency: 5,
          retryCount: 4,
          injectTimeoutMs: 25000,
          domSettleMs: 900
        }
      },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })

    expect(saveGeneralSettingsMock).toHaveBeenCalledWith({
      downloaderConfig: {
        activeId: "qbittorrent",
        profiles: {
          qbittorrent: {
            baseUrl: "http://127.0.0.1:17474",
            username: "admin",
            password: "secret"
          },
          transmission: {
            baseUrl: "http://127.0.0.1:9091/transmission/rpc",
            username: "",
            password: ""
          }
        }
      },
      batchExecutionConfig: {
        concurrency: 5,
        retryCount: 4,
        injectTimeoutMs: 25000,
        domSettleMs: 900
      }
    })

    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      downloaderConfig: {
        activeId: "qbittorrent",
        profiles: {
          qbittorrent: {
            baseUrl: "http://127.0.0.1:17474",
            username: "admin",
            password: "secret"
          },
          transmission: {
            baseUrl: "http://127.0.0.1:9091/transmission/rpc",
            username: "",
            password: ""
          }
        }
      },
      batchExecutionConfig: {
        concurrency: 5,
        retryCount: 4,
        injectTimeoutMs: 25000,
        domSettleMs: 900
      }
    })
  })

  it("returns history page context for GET_HISTORY_PAGE_CONTEXT request", async () => {
    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    getDownloaderConfigMock.mockResolvedValue({
      activeId: "transmission",
      profiles: {
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: "secret"
        },
        transmission: {
          baseUrl: "http://127.0.0.1:9091/transmission/rpc",
          username: "",
          password: ""
        }
      }
    })

    listener?.(
      {
        type: "GET_HISTORY_PAGE_CONTEXT"
      },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledTimes(1)
    })

    expect(sendResponse).toHaveBeenCalledWith({
      ok: true,
      context: {
        currentDownloaderId: "transmission"
      }
    })
  })
})
