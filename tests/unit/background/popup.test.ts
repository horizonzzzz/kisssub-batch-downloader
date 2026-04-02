import { describe, expect, it, vi } from "vitest"

import { DEFAULT_SETTINGS } from "../../../lib/settings/defaults"
import {
  buildPopupState,
  notifyActiveTabOfSourceEnabledChange,
  normalizePopupOptionsRoute,
  openOptionsPageForRoute,
  setSourceEnabledForPopup
} from "../../../lib/background/popup"
import { SOURCE_IDS } from "../../../lib/sources/catalog"
import type { Settings } from "../../../lib/shared/types"

function createSettings(overrides: Partial<Settings> = {}): Settings {
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
      qbUsername: "admin",
      qbPassword: "secret",
      enabledSources: {
        ...DEFAULT_SETTINGS.enabledSources,
        acgrip: false
      }
    })

    const state = await buildPopupState({
      getSettings: async () => settings,
      getActiveTabUrl: async () => "https://acg.rip/",
      getExtensionVersion: () => "1.4.0"
    })

    expect(state.qbConnectionStatus).toBe("idle")
    expect(state.activeTab).toEqual({
      url: "https://acg.rip/",
      sourceId: "acgrip",
      supported: true,
      enabled: false
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
      getActiveTabUrl: async () => "https://www.acg.rip/",
      getExtensionVersion: () => "1.4.0"
    })

    expect(state.activeTab).toEqual({
      url: "https://www.acg.rip/",
      sourceId: "acgrip",
      supported: true,
      enabled: true
    })
    expect(state.qbConnectionStatus).toBe("checking")
  })

  it("keeps unsupported pages idle even when qB credentials are explicitly changed", async () => {
    const state = await buildPopupState({
      getSettings: async () =>
        createSettings({
          qbBaseUrl: "http://127.0.0.1:17474",
          qbUsername: "",
          qbPassword: ""
        }),
      getActiveTabUrl: async () => "https://example.com/list",
      getExtensionVersion: () => "1.4.0"
    })

    expect(state.qbConnectionStatus).toBe("idle")
  })

  it("marks supported and enabled active tabs as requiring a qB connection check even with the default qB placeholder config", async () => {
    const state = await buildPopupState({
      getSettings: async () => createSettings(),
      getActiveTabUrl: async () => "https://kisssub.org/",
      getExtensionVersion: () => "1.4.0"
    })

    expect(state.qbConnectionStatus).toBe("checking")
    expect(state.activeTab).toEqual({
      url: "https://kisssub.org/",
      sourceId: "kisssub",
      supported: true,
      enabled: true
    })
  })

  it("treats null or malformed active-tab URLs as unsupported without throwing", async () => {
    const nullUrlState = await buildPopupState({
      getSettings: async () => createSettings(),
      getActiveTabUrl: async () => null,
      getExtensionVersion: () => "1.4.0"
    })
    const malformedUrlState = await buildPopupState({
      getSettings: async () => createSettings(),
      getActiveTabUrl: async () => "not-a-valid-url",
      getExtensionVersion: () => "1.4.0"
    })

    expect(nullUrlState.activeTab).toEqual({
      url: null,
      sourceId: null,
      supported: false,
      enabled: false
    })
    expect(malformedUrlState.activeTab).toEqual({
      url: "not-a-valid-url",
      sourceId: null,
      supported: false,
      enabled: false
    })
  })

  it("updates only enabledSources when toggling a source from popup", async () => {
    const settings = createSettings({
      qbBaseUrl: "http://127.0.0.1:18444",
      enabledSources: {
        kisssub: true,
        dongmanhuayuan: true,
        acgrip: true,
        bangumimoe: false
      }
    })
    const saveSettings = vi.fn(async (partial: Partial<Settings>) => ({
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
    expect(updated.qbBaseUrl).toBe("http://127.0.0.1:18444")
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
})
