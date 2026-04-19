import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest"

import {
  BATCH_EVENT,
  CONTENT_SETTINGS_CHANGED_EVENT,
  createRuntimeErrorResponse,
  createRuntimeSuccessResponse,
  sendRuntimeRequest,
  type RuntimeRequestType
} from "../../../src/lib/shared/messages"
import type { PopupStateViewModel } from "../../../src/lib/shared/popup"

import type { DownloaderId } from "../../../src/lib/shared/types"

const runtimeSendMessage = vi.fn()

function installChromeMock() {
  const extensionApi = {
    runtime: {
      sendMessage: runtimeSendMessage
    }
  }

  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: extensionApi
  })
  Object.defineProperty(globalThis, "browser", {
    configurable: true,
    value: extensionApi
  })
}

describe("runtime message helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installChromeMock()
  })

  it("does not expose GET_APP_SETTINGS anymore", () => {
    expectTypeOf<Extract<RuntimeRequestType, "GET_APP_SETTINGS">>().toEqualTypeOf<never>()
  })

  it("does not expose SAVE_APP_SETTINGS anymore", () => {
    expectTypeOf<Extract<RuntimeRequestType, "SAVE_APP_SETTINGS">>().toEqualTypeOf<never>()
  })

  it("delegates downloader config requests and returns the response", async () => {
    const downloaderConfig = {
      activeId: "qbittorrent" as DownloaderId,
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
    const response = createRuntimeSuccessResponse("GET_DOWNLOADER_CONFIG", {
      config: downloaderConfig
    })
    runtimeSendMessage.mockResolvedValue(response)

    await expect(sendRuntimeRequest({ type: "GET_DOWNLOADER_CONFIG" })).resolves.toEqual(response)
    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "GET_DOWNLOADER_CONFIG"
    })
  })

  it("supports unified general-settings runtime requests", async () => {
    runtimeSendMessage.mockResolvedValue({
      ok: true,
      downloaderConfig: {
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
      },
      batchExecutionConfig: {
        concurrency: 3,
        retryCount: 3,
        injectTimeoutMs: 15000,
        domSettleMs: 1200
      }
    })

    await sendRuntimeRequest({
      type: "SAVE_GENERAL_SETTINGS",
      downloaderConfig: {
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
      },
      batchExecutionConfig: {
        concurrency: 3,
        retryCount: 3,
        injectTimeoutMs: 15000,
        domSettleMs: 1200
      }
    })

    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "SAVE_GENERAL_SETTINGS",
      downloaderConfig: {
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
      },
      batchExecutionConfig: {
        concurrency: 3,
        retryCount: 3,
        injectTimeoutMs: 15000,
        domSettleMs: 1200
      }
    })
  })

  it("creates typed success responses for batch startup", () => {
    expect(
      createRuntimeSuccessResponse("START_BATCH_DOWNLOAD", {
        total: 2
      })
    ).toEqual({
      ok: true,
      total: 2
    })
  })

  it("supports popup runtime requests and typed popup state responses", () => {
    const popupState: PopupStateViewModel = {
      downloaderConnectionStatus: "idle",
      currentDownloaderId: "qbittorrent",
      currentDownloaderName: "qBittorrent",
      activeTab: {
        url: null,
        sourceId: null,
        supported: false,
        enabled: false,
        batchRunning: false
      },
      supportedSites: [],
      version: "1.4.0",
      helpUrl: "https://github.com/horizonzzzz/anime-bt-batch-downloader"
    }

    expect(
      createRuntimeSuccessResponse("GET_POPUP_STATE", {
        state: popupState
      })
    ).toEqual({
      ok: true,
      state: popupState
    })
  })

  it("keeps TEST_DOWNLOADER_CONNECTION available for downloader-config probes", async () => {
    runtimeSendMessage.mockResolvedValue({
      ok: true,
      result: {
        downloaderId: "qbittorrent",
        displayName: "qBittorrent",
        baseUrl: "http://127.0.0.1:17474",
        version: "5.0.0"
      }
    })

    await sendRuntimeRequest({
      type: "TEST_DOWNLOADER_CONNECTION",
      settings: {
        activeId: "qbittorrent" as DownloaderId,
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
    })

    expect(runtimeSendMessage).toHaveBeenCalledWith({
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
    })
  })

  it("creates a shared runtime error response", () => {
    expect(createRuntimeErrorResponse("boom")).toEqual({
      ok: false,
      error: "boom"
    })
  })

  it("uses a source-neutral batch event channel name", () => {
    expect(BATCH_EVENT).toBe("ANIME_BT_BATCH_EVENT")
  })

  it("uses a unified content-settings event channel name", () => {
    expect(CONTENT_SETTINGS_CHANGED_EVENT).toBe("ANIME_BT_CONTENT_SETTINGS_CHANGED_EVENT")
  })

  it("supports filter-config runtime requests", async () => {
    runtimeSendMessage.mockResolvedValue({
      ok: true,
      config: { rules: [] }
    })

    await sendRuntimeRequest({ type: "GET_FILTER_CONFIG" })
    await sendRuntimeRequest({
      type: "SAVE_FILTER_CONFIG",
      config: { rules: [] }
    })

    expect(runtimeSendMessage).toHaveBeenNthCalledWith(1, {
      type: "GET_FILTER_CONFIG"
    })
    expect(runtimeSendMessage).toHaveBeenNthCalledWith(2, {
      type: "SAVE_FILTER_CONFIG",
      config: { rules: [] }
    })
  })
})
