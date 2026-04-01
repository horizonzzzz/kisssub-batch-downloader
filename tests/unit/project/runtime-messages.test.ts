import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  BATCH_EVENT,
  SOURCE_ENABLED_CHANGE_EVENT,
  createRuntimeErrorResponse,
  createRuntimeSuccessResponse,
  sendRuntimeRequest
} from "../../../lib/shared/messages"
import { DEFAULT_SETTINGS } from "../../../lib/settings/defaults"
import type { PopupStateViewModel } from "../../../lib/shared/popup"

const runtimeSendMessage = vi.fn()

function installChromeMock() {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        sendMessage: runtimeSendMessage
      }
    }
  })
}

describe("runtime message helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    installChromeMock()
  })

  it("delegates a runtime request to chrome.runtime.sendMessage and returns the response", async () => {
    const response = createRuntimeSuccessResponse("GET_SETTINGS", {
      settings: DEFAULT_SETTINGS
    })
    runtimeSendMessage.mockResolvedValue(response)

    await expect(sendRuntimeRequest({ type: "GET_SETTINGS" })).resolves.toEqual(response)
    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "GET_SETTINGS"
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
      qbConnectionStatus: "idle",
      activeTab: {
        url: null,
        sourceId: null,
        supported: false,
        enabled: false
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
