import { createBatchDownloadManager, testQbConnection } from "./lib/background"
import { addTorrentFilesToQb, addUrlsToQb, loginQb } from "./lib/downloader/qb"
import { ensureSettings, getSettings, saveSettings } from "./lib/settings"
import {
  BATCH_EVENT,
  createRuntimeErrorResponse,
  createRuntimeSuccessResponse,
  type RuntimeRequest
} from "./lib/shared/messages"
import type { BatchEventPayload } from "./lib/shared/types"
import { extractSingleItem } from "./lib/sources/extraction"

const batchDownloadManager = createBatchDownloadManager({
  saveSettings,
  extractSingleItem,
  sendBatchEvent,
  loginQb,
  addUrlsToQb,
  addTorrentFilesToQb
})

chrome.runtime.onInstalled.addListener(() => {
  void ensureSettings()
})

chrome.runtime.onMessage.addListener((message: RuntimeRequest, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return false
  }

  void (async () => {
    try {
      switch (message.type) {
        case "GET_SETTINGS":
          sendResponse(
            createRuntimeSuccessResponse("GET_SETTINGS", {
              settings: await getSettings()
            })
          )
          return
        case "SAVE_SETTINGS":
          sendResponse(
            createRuntimeSuccessResponse("SAVE_SETTINGS", {
              settings: await saveSettings(message.settings ?? {})
            })
          )
          return
        case "TEST_QB_CONNECTION":
          sendResponse(
            createRuntimeSuccessResponse("TEST_QB_CONNECTION", {
              result: await testQbConnection(message.settings ?? null)
            })
          )
          return
        case "OPEN_OPTIONS_PAGE":
          await chrome.runtime.openOptionsPage()
          sendResponse(createRuntimeSuccessResponse("OPEN_OPTIONS_PAGE", {}))
          return
        case "START_BATCH_DOWNLOAD":
          sendResponse(
            await batchDownloadManager.startBatchDownload(
              typeof sender.tab?.id === "number" ? sender.tab.id : null,
              message.items ?? [],
              message.savePath
            )
          )
          return
        default:
          sendResponse(
            createRuntimeErrorResponse(
              `Unsupported message type: ${String((message as { type: string }).type)}`
            )
          )
      }
    } catch (error) {
      sendResponse(createRuntimeErrorResponse(error instanceof Error ? error.message : String(error)))
    }
  })()

  return true
})

async function sendBatchEvent(tabId: number, payload: BatchEventPayload) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: BATCH_EVENT,
      ...payload
    })
  } catch {
    // Ignore tabs that navigated away or were closed.
  }
}

export {}
