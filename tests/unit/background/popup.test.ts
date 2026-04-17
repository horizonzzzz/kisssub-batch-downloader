import { describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "../../../src/lib/settings/defaults"
import {
  buildPopupState,
  notifyActiveTabOfSourceEnabledChange,
  normalizePopupOptionsRoute,
  openOptionsPageForRoute,
  setSourceEnabledForPopup
} from "../../../src/lib/background/popup"
import { SOURCE_IDS } from "../../../src/lib/sources/catalog"
import type { AppSettings } from "../../../src/lib/shared/types"

function createSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    sourceDeliveryModes: {
      ...DEFAULT_SETTINGS.sourceDeliveryModes
    },
    enabledSources: {
      ...DEFAULT_SETTINGS.enabledSources
    },
    ...overrides
  }
}

describe("popup background helpers", () => {
  it("builds popup state from settings, active tab URL, site metadata, and version info", async () => {
    const settings = createSettings({
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          ...DEFAULT_SETTINGS.downloaders.qbittorrent,
          username: "admin",
          password: "secret"
        }
      },
      enabledSources: {
        ...DEFAULT_SETTINGS.enabledSources,
        acgrip: false
      }
    })

    const state = await buildPopupState({
      getSettings: async () => settings,
      getActiveTabContext: async () => ({
        id: 17,
        url: "https://acg.rip/"
      }),
      getExtensionVersion: () => "1.4.0",
      isBatchRunningInTab: () => false
    })

    expect(state.downloaderConnectionStatus).toBe("idle")
    expect(state.currentDownloaderId).toBe("qbittorrent")
    expect(state.currentDownloaderName).toBe("qBittorrent")
    expect(state.activeTab).toEqual({
      url: "https://acg.rip/",
      sourceId: "acgrip",
      supported: true,
      enabled: false,
      batchRunning: false
    })
    expect(state.supportedSites.map((site) => site.id)).toEqual(SOURCE_IDS)
    expect(state.supportedSites.find((site) => site.id === "acgrip")).toMatchObject({
      id: "acgrip",
      enabled: false,
      url: "acg.rip"
    })
    expect(state.version).toBe("1.4.0")
    expect(state.helpUrl).toBe("https://github.com/horizonzzzz/anime-bt-batch-downloader")
  })

  it("treats www.acg.rip list pages as supported active tabs", async () => {
    const state = await buildPopupState({
      getSettings: async () => createSettings(),
      getActiveTabContext: async () => ({
        id: 23,
        url: "https://www.acg.rip/"
      }),
      getExtensionVersion: () => "1.4.0",
      isBatchRunningInTab: () => false
    })

    expect(state.activeTab).toEqual({
      url: "https://www.acg.rip/",
      sourceId: "acgrip",
      supported: true,
      enabled: true,
      batchRunning: false
    })
    expect(state.downloaderConnectionStatus).toBe("checking")
  })

  it("keeps unsupported pages idle even when downloader credentials are explicitly changed", async () => {
    const state = await buildPopupState({
      getSettings: async () =>
        createSettings({
          downloaders: {
            ...DEFAULT_SETTINGS.downloaders,
            qbittorrent: {
              baseUrl: "http://127.0.0.1:17474",
              username: "",
              password: ""
            }
          }
        }),
      getActiveTabContext: async () => ({
        id: 31,
        url: "https://example.com/list"
      }),
      getExtensionVersion: () => "1.4.0",
      isBatchRunningInTab: () => false
    })

    expect(state.downloaderConnectionStatus).toBe("idle")
  })

  it("marks supported and enabled active tabs as requiring a downloader connection check even with the default placeholder config", async () => {
    const state = await buildPopupState({
      getSettings: async () => createSettings(),
      getActiveTabContext: async () => ({
        id: 19,
        url: "https://kisssub.org/"
      }),
      getExtensionVersion: () => "1.4.0",
      isBatchRunningInTab: (tabId) => tabId === 19
    })

    expect(state.downloaderConnectionStatus).toBe("checking")
    expect(state.activeTab).toEqual({
      url: "https://kisssub.org/",
      sourceId: "kisssub",
      supported: true,
      enabled: true,
      batchRunning: true
    })
  })

  it("treats null or malformed active-tab URLs as unsupported without throwing", async () => {
    const nullUrlState = await buildPopupState({
      getSettings: async () => createSettings(),
      getActiveTabContext: async () => ({
        id: null,
        url: null
      }),
      getExtensionVersion: () => "1.4.0",
      isBatchRunningInTab: () => true
    })
    const malformedUrlState = await buildPopupState({
      getSettings: async () => createSettings(),
      getActiveTabContext: async () => ({
        id: 88,
        url: "not-a-valid-url"
      }),
      getExtensionVersion: () => "1.4.0",
      isBatchRunningInTab: () => false
    })

    expect(nullUrlState.activeTab).toEqual({
      url: null,
      sourceId: null,
      supported: false,
      enabled: false,
      batchRunning: false
    })
    expect(malformedUrlState.activeTab).toEqual({
      url: "not-a-valid-url",
      sourceId: null,
      supported: false,
      enabled: false,
      batchRunning: false
    })
  })

  it("updates only enabledSources when toggling a source from popup", async () => {
    const settings = createSettings({
      downloaders: {
        ...DEFAULT_SETTINGS.downloaders,
        qbittorrent: {
          ...DEFAULT_SETTINGS.downloaders.qbittorrent,
          baseUrl: "http://127.0.0.1:18444"
        }
      },
      enabledSources: {
        kisssub: true,
        dongmanhuayuan: true,
        acgrip: true,
        bangumimoe: false
      }
    })
    const saveSettings = vi.fn(async (partial: Partial<AppSettings>) => ({
      ...settings,
      ...partial,
      enabledSources: {
        ...settings.enabledSources,
        ...(partial.enabledSources ?? {})
      }
    }))

    const updated = await setSourceEnabledForPopup("acgrip", false, {
      getSettings: async () => settings,
      saveSettings
    })

    expect(saveSettings).toHaveBeenCalledWith({
      enabledSources: {
        kisssub: true,
        dongmanhuayuan: true,
        acgrip: false,
        bangumimoe: false
      }
    })
    expect(updated.downloaders.qbittorrent.baseUrl).toBe("http://127.0.0.1:18444")
    expect(updated.enabledSources).toEqual({
      kisssub: true,
      dongmanhuayuan: true,
      acgrip: false,
      bangumimoe: false
    })
  })

  it("normalizes popup options routes and opens deep-linked options tabs", async () => {
    const createTab = vi.fn(async () => undefined)
    const queryOptionsTabs = vi.fn(async () => [])
    const updateTab = vi.fn(async () => undefined)
    const focusWindow = vi.fn(async () => undefined)
    const getExtensionUrl = vi.fn((path: string) => `chrome-extension://test/${path}`)

    await openOptionsPageForRoute("/filters", {
      queryOptionsTabs,
      updateTab,
      focusWindow,
      createTab,
      getExtensionUrl
    })

    expect(normalizePopupOptionsRoute("/history")).toBe("/history")
    expect(normalizePopupOptionsRoute("/unknown")).toBe("/general")
    expect(queryOptionsTabs).toHaveBeenCalledTimes(1)
    expect(updateTab).not.toHaveBeenCalled()
    expect(focusWindow).not.toHaveBeenCalled()
    expect(createTab).toHaveBeenCalledWith("chrome-extension://test/options.html#/filters")
  })

  it("reuses an existing options tab by updating route and focusing its window", async () => {
    const createTab = vi.fn(async () => undefined)
    const queryOptionsTabs = vi.fn(async () => [{ tabId: 42, windowId: 7 }])
    const updateTab = vi.fn(async () => undefined)
    const focusWindow = vi.fn(async () => undefined)
    const getExtensionUrl = vi.fn((path: string) => `chrome-extension://test/${path}`)

    await openOptionsPageForRoute("/history", {
      queryOptionsTabs,
      updateTab,
      focusWindow,
      createTab,
      getExtensionUrl
    })

    expect(updateTab).toHaveBeenCalledWith(42, "chrome-extension://test/options.html#/history")
    expect(focusWindow).toHaveBeenCalledWith(7)
    expect(createTab).not.toHaveBeenCalled()
  })

  it("notifies the active tab when the popup toggles the current source", async () => {
    const queryActiveTabId = vi.fn(async () => 11)
    const sendMessageToTab = vi.fn(async () => undefined)

    await notifyActiveTabOfSourceEnabledChange("kisssub", false, {
      queryActiveTabId,
      sendMessageToTab
    })

    expect(queryActiveTabId).toHaveBeenCalledTimes(1)
    expect(sendMessageToTab).toHaveBeenCalledWith(11, {
      type: "ANIME_BT_SOURCE_ENABLED_CHANGE_EVENT",
      sourceId: "kisssub",
      enabled: false
    })
  })

  it("ignores source-toggle tab sync when no active tab is available", async () => {
    const queryActiveTabId = vi.fn(async () => null)
    const sendMessageToTab = vi.fn(async () => undefined)

    await notifyActiveTabOfSourceEnabledChange("kisssub", true, {
      queryActiveTabId,
      sendMessageToTab
    })

    expect(sendMessageToTab).not.toHaveBeenCalled()
  })

  it("broadcasts filter updates to supported source tabs without touching unrelated pages", async () => {
    const popupModule = (await import("../../../src/lib/background/popup")) as Record<string, unknown>
    const notifySupportedSourceTabsOfFilterChange = popupModule
      .notifySupportedSourceTabsOfFilterChange as
      | ((dependencies?: {
          queryTabs: () => Promise<Array<{ id?: number; url?: string | null }>>
          sendMessageToTab: (tabId: number, message: { type: string }) => Promise<void>
        }) => Promise<void>)
      | undefined

    expect(notifySupportedSourceTabsOfFilterChange).toBeTypeOf("function")

    const queryTabs = vi.fn(async () => [
      { id: 11, url: "https://acg.rip/" },
      { id: 12, url: "https://bangumi.moe/search" },
      { id: 13, url: "https://example.com/" },
      { id: undefined, url: "https://kisssub.org/list" }
    ])
    const sendMessageToTab = vi.fn(async () => undefined)

    await notifySupportedSourceTabsOfFilterChange?.({
      queryTabs,
      sendMessageToTab
    })

    expect(queryTabs).toHaveBeenCalledTimes(1)
    expect(sendMessageToTab).toHaveBeenCalledTimes(2)
    expect(sendMessageToTab).toHaveBeenNthCalledWith(1, 11, {
      type: "ANIME_BT_FILTERS_UPDATED_EVENT"
    })
    expect(sendMessageToTab).toHaveBeenNthCalledWith(2, 12, {
      type: "ANIME_BT_FILTERS_UPDATED_EVENT"
    })
  })
})
