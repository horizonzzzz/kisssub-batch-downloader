import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  BATCH_EVENT,
  SOURCE_ENABLED_CHANGE_EVENT,
  createRuntimeErrorResponse,
  createRuntimeSuccessResponse,
  sendRuntimeRequest
} from "../../../src/lib/shared/messages"
import { DEFAULT_SETTINGS } from "../../../src/lib/settings/defaults"
import type { PopupStateViewModel } from "../../../src/lib/shared/popup"

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

  it("delegates a runtime request to chrome.runtime.sendMessage and returns the response", async () => {
    const response = createRuntimeSuccessResponse("GET_APP_SETTINGS", {
      settings: DEFAULT_SETTINGS
    })
    runtimeSendMessage.mockResolvedValue(response)

    await expect(sendRuntimeRequest({ type: "GET_APP_SETTINGS" })).resolves.toEqual(response)
    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "GET_APP_SETTINGS"
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

  it("keeps TEST_DOWNLOADER_CONNECTION available for partial app settings probes", async () => {
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
        currentDownloaderId: "qbittorrent"
      }
    })

    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "TEST_DOWNLOADER_CONNECTION",
      settings: {
        currentDownloaderId: "qbittorrent"
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

  it("uses a dedicated source-enablement event channel name", () => {
    expect(SOURCE_ENABLED_CHANGE_EVENT).toBe("ANIME_BT_SOURCE_ENABLED_CHANGE_EVENT")
  })
})
