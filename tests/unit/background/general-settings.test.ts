import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { DEFAULT_BATCH_EXECUTION_CONFIG } from "../../../src/lib/batch-config/defaults"
import { DEFAULT_DOWNLOADER_CONFIG } from "../../../src/lib/downloader/config/defaults"
import { saveGeneralSettings } from "../../../src/lib/background/general-settings"

vi.mock("../../../src/lib/shared/browser", () => ({
  getBrowser: () => fakeBrowser
}))

describe("background general settings save", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    fakeBrowser.storage.local.clear()
  })

  it("writes both config domains in a single sanitized save", async () => {
    const saved = await saveGeneralSettings({
      downloaderConfig: {
        activeId: "qbittorrent",
        profiles: {
          qbittorrent: {
            baseUrl: " http://127.0.0.1:17474/// ",
            username: " admin ",
            password: "secret"
          },
          transmission: DEFAULT_DOWNLOADER_CONFIG.profiles.transmission
        }
      },
      batchExecutionConfig: {
        concurrency: 99,
        retryCount: -1,
        injectTimeoutMs: 999999,
        domSettleMs: 1
      }
    })

    expect(saved).toEqual({
      downloaderConfig: {
        activeId: "qbittorrent",
        profiles: {
          qbittorrent: {
            baseUrl: "http://127.0.0.1:17474",
            username: "admin",
            password: "secret"
          },
          transmission: DEFAULT_DOWNLOADER_CONFIG.profiles.transmission
        }
      },
      batchExecutionConfig: {
        concurrency: 5,
        retryCount: 0,
        injectTimeoutMs: 60000,
        domSettleMs: 200
      }
    })

    const stored = await fakeBrowser.storage.local.get([
      "downloader_config",
      "batch_execution_config"
    ])

    expect(stored).toEqual({
      downloader_config: saved.downloaderConfig,
      batch_execution_config: saved.batchExecutionConfig
    })
  })

  it("does not update either storage key when downloader validation fails", async () => {
    await fakeBrowser.storage.local.set({
      downloader_config: DEFAULT_DOWNLOADER_CONFIG,
      batch_execution_config: DEFAULT_BATCH_EXECUTION_CONFIG
    })

    await expect(
      saveGeneralSettings({
        downloaderConfig: {
          ...DEFAULT_DOWNLOADER_CONFIG,
          profiles: {
            ...DEFAULT_DOWNLOADER_CONFIG.profiles,
            qbittorrent: {
              ...DEFAULT_DOWNLOADER_CONFIG.profiles.qbittorrent,
              baseUrl: ""
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
    ).rejects.toThrow("Active downloader base URL is required.")

    const stored = await fakeBrowser.storage.local.get([
      "downloader_config",
      "batch_execution_config"
    ])

    expect(stored).toEqual({
      downloader_config: DEFAULT_DOWNLOADER_CONFIG,
      batch_execution_config: DEFAULT_BATCH_EXECUTION_CONFIG
    })
  })
})
