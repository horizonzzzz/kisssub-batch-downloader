import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { DEFAULT_DOWNLOADER_CONFIG } from "../../../src/lib/downloader/config/defaults"
import {
  getDownloaderConfig,
  saveDownloaderConfig
} from "../../../src/lib/downloader/config/storage"

describe("downloader config storage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    fakeBrowser.storage.local.clear()
  })

  it("hydrates default downloader config", async () => {
    const config = await getDownloaderConfig()

    expect(config).toEqual(DEFAULT_DOWNLOADER_CONFIG)
  })

  it("trims baseUrl and username before saving", async () => {
    const saved = await saveDownloaderConfig({
      activeId: "qbittorrent",
      profiles: {
        qbittorrent: {
          baseUrl: " http://127.0.0.1:17474/// ",
          username: " admin ",
          password: "secret"
        },
        transmission: DEFAULT_DOWNLOADER_CONFIG.profiles.transmission
      }
    })

    expect(saved.profiles.qbittorrent.baseUrl).toBe("http://127.0.0.1:17474")
    expect(saved.profiles.qbittorrent.username).toBe("admin")
  })

  it("ignores legacy app_settings downloader fields and hydrates defaults", async () => {
    await fakeBrowser.storage.local.set({
      app_settings: {
        currentDownloaderId: "transmission",
        downloaders: {
          qbittorrent: {
            baseUrl: "http://192.168.1.100:8080",
            username: "qbuser",
            password: "qbpass"
          },
          transmission: {
            baseUrl: "http://192.168.1.100:9091/transmission/rpc",
            username: "truser",
            password: "trpass"
          }
        }
      }
    })

    const config = await getDownloaderConfig()

    expect(config).toEqual(DEFAULT_DOWNLOADER_CONFIG)

    const stored = await fakeBrowser.storage.local.get("downloader_config")
    expect(stored.downloader_config).toEqual(config)
  })

  it("persists downloader config changes to dedicated storage key", async () => {
    const saved = await saveDownloaderConfig({
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

    expect(saved.activeId).toBe("transmission")

    const stored = await fakeBrowser.storage.local.get("downloader_config")
    expect(stored.downloader_config).toEqual(saved)

    // Re-read to verify persistence
    const reRead = await getDownloaderConfig()
    expect(reRead).toEqual(saved)
  })
})
