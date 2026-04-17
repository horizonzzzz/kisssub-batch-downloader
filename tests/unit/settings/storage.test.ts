import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

import { DEFAULT_SETTINGS } from "../../../src/lib/settings/defaults"
import { ensureSettings, getSettings, saveSettings } from "../../../src/lib/settings/storage"

describe("settings storage helpers", () => {
  let getSpy: ReturnType<typeof vi.spyOn>
  let setSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    getSpy = vi.spyOn(fakeBrowser.storage.local, "get")
    setSpy = vi.spyOn(fakeBrowser.storage.local, "set")
  })

  it("writes default app settings when storage is empty", async () => {
    await ensureSettings()

    expect(setSpy).toHaveBeenCalledWith({
      app_settings_v1: DEFAULT_SETTINGS
    })
    await expect(fakeBrowser.storage.local.get("app_settings_v1")).resolves.toEqual({
      app_settings_v1: DEFAULT_SETTINGS
    })
  })

  it("hydrates missing defaults and sanitizes stored values when reading app settings", async () => {
    await fakeBrowser.storage.local.set({
      app_settings_v1: {
        currentDownloaderId: "qbittorrent",
        downloaders: {
          qbittorrent: {
            baseUrl: " http://127.0.0.1:17474/// ",
            username: " admin "
          }
        },
        lastSavePath: "  D:\\Anime  ",
        enabledSources: {
          kisssub: false
        }
      }
    })

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: ""
        }
      },
      lastSavePath: "D:\\Anime",
      filters: [],
      enabledSources: {
        kisssub: false,
        dongmanhuayuan: true,
        acgrip: true,
        bangumimoe: true
      }
    })

    expect(setSpy).toHaveBeenCalledTimes(1)
  })

  it("ignores legacy storage keys when reading app settings", async () => {
    await fakeBrowser.storage.local.set({
      settings: {
        currentDownloaderId: "transmission"
      },
      settings_v2: {
        currentDownloaderId: "transmission"
      },
      app_settings_v1: {
        currentDownloaderId: "qbittorrent",
        downloaders: {
          qbittorrent: {
            baseUrl: " http://127.0.0.1:17474/// ",
            username: " admin "
          }
        }
      }
    })

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          baseUrl: "http://127.0.0.1:17474",
          username: "admin",
          password: ""
        }
      }
    })
  })

  it("persists only the app-settings document", async () => {
    await saveSettings({
      currentDownloaderId: "transmission",
      subscriptionsEnabled: true,
      subscriptions: [{ id: "sub-1" }],
      lastSchedulerRunAt: "2026-04-13T01:23:45.000Z",
      subscriptionRuntimeStateById: {
        "sub-1": { lastScanAt: "x" }
      },
      subscriptionNotificationRounds: [{ id: "round-1", createdAt: "x", hitIds: [] }]
    } as never)

    expect(setSpy).toHaveBeenLastCalledWith({
      app_settings_v1: expect.objectContaining({
        currentDownloaderId: "transmission",
        subscriptionsEnabled: true
      })
    })

    const persisted = setSpy.mock.calls.at(-1)?.[0]?.app_settings_v1 as Record<string, unknown>

    expect(persisted).not.toHaveProperty("subscriptions")
    expect(persisted).not.toHaveProperty("lastSchedulerRunAt")
    expect(persisted).not.toHaveProperty("subscriptionRuntimeStateById")
    expect(persisted).not.toHaveProperty("subscriptionNotificationRounds")
  })

  it("initializes defaults before saving when storage was previously empty", async () => {
    await expect(
      saveSettings({
        downloaders: {
          qbittorrent: {
            username: " admin "
          }
        }
      })
    ).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          ...DEFAULT_SETTINGS.downloaders.qbittorrent,
          username: "admin"
        }
      }
    })

    expect(setSpy).toHaveBeenCalledTimes(2)
    expect(setSpy.mock.calls[0]?.[0]).toEqual({
      app_settings_v1: DEFAULT_SETTINGS
    })
    expect(getSpy).toHaveBeenCalled()
  })
})
