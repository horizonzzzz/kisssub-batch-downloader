import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

type RuntimeInstalledListener = Parameters<typeof fakeBrowser.runtime.onInstalled.addListener>[0]
type RuntimeMessageListener = Parameters<typeof fakeBrowser.runtime.onMessage.addListener>[0]
type TabsUpdatedListener = Parameters<typeof fakeBrowser.tabs.onUpdated.addListener>[0]
type TabsActivatedListener = Parameters<typeof fakeBrowser.tabs.onActivated.addListener>[0]

const onInstalledAddListener = vi.hoisted(() => vi.fn())
const onUpdatedAddListener = vi.hoisted(() => vi.fn())
const onActivatedAddListener = vi.hoisted(() => vi.fn())
const setIconMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
const queryTabsMock = vi.hoisted(() => vi.fn(async () => []))
const getTabMock = vi.hoisted(() => vi.fn(async () => ({ id: 1, url: "https://example.com/" })))
const sendMessageMock = vi.hoisted(() => vi.fn())
const onMessageAddListener = vi.hoisted(() => vi.fn())
const openOptionsPageMock = vi.hoisted(() => vi.fn())

function installBrowserSpies() {
  vi.spyOn(fakeBrowser.runtime.onInstalled, "addListener").mockImplementation((listener: RuntimeInstalledListener) => {
    onInstalledAddListener(listener)
  })
  vi.spyOn(fakeBrowser.runtime.onMessage, "addListener").mockImplementation((listener: RuntimeMessageListener) => {
    onMessageAddListener(listener)
  })
  vi.spyOn(fakeBrowser.runtime, "openOptionsPage").mockImplementation(openOptionsPageMock as never)
  vi.spyOn(fakeBrowser.action, "setIcon").mockImplementation(setIconMock as never)
  vi.spyOn(fakeBrowser.tabs, "query").mockImplementation(queryTabsMock as never)
  vi.spyOn(fakeBrowser.tabs, "get").mockImplementation(getTabMock as never)
  vi.spyOn(fakeBrowser.tabs, "sendMessage").mockImplementation(sendMessageMock as never)
  vi.spyOn(fakeBrowser.tabs.onUpdated, "addListener").mockImplementation((listener: TabsUpdatedListener) => {
    onUpdatedAddListener(listener)
  })
  vi.spyOn(fakeBrowser.tabs.onActivated, "addListener").mockImplementation((listener: TabsActivatedListener) => {
    onActivatedAddListener(listener)
  })
}

describe("resolveIsSupportedSite", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    installBrowserSpies()
  })

  it("returns true for supported kisssub URL", async () => {
    const { resolveIsSupportedSite } = await import("../../../src/entrypoints/background/runtime")

    const result = resolveIsSupportedSite("https://www.kisssub.org/")

    expect(result).toBe(true)
  }, 10000)

  it("returns true for supported dongmanhuayuan URL", async () => {
    const { resolveIsSupportedSite } = await import("../../../src/entrypoints/background/runtime")

    const result = resolveIsSupportedSite("https://www.dongmanhuayuan.com/")

    expect(result).toBe(true)
  })

  it("returns true for supported acgrip URL", async () => {
    const { resolveIsSupportedSite } = await import("../../../src/entrypoints/background/runtime")

    const result = resolveIsSupportedSite("https://acg.rip/")

    expect(result).toBe(true)
  })

  it("returns true for supported www.acgrip URL", async () => {
    const { resolveIsSupportedSite } = await import("../../../src/entrypoints/background/runtime")

    const result = resolveIsSupportedSite("https://www.acg.rip/")

    expect(result).toBe(true)
  })

  it("returns false for unsupported URL", async () => {
    const { resolveIsSupportedSite } = await import("../../../src/entrypoints/background/runtime")

    const result = resolveIsSupportedSite("https://www.google.com/")

    expect(result).toBe(false)
  })

  it("returns false for null URL", async () => {
    const { resolveIsSupportedSite } = await import("../../../src/entrypoints/background/runtime")

    const result = resolveIsSupportedSite(null)

    expect(result).toBe(false)
  })

  it("returns false for undefined URL", async () => {
    const { resolveIsSupportedSite } = await import("../../../src/entrypoints/background/runtime")

    const result = resolveIsSupportedSite(undefined)

    expect(result).toBe(false)
  })

  it("returns false for empty string URL", async () => {
    const { resolveIsSupportedSite } = await import("../../../src/entrypoints/background/runtime")

    const result = resolveIsSupportedSite("")

    expect(result).toBe(false)
  })

  it("returns false for chrome:// URL", async () => {
    const { resolveIsSupportedSite } = await import("../../../src/entrypoints/background/runtime")

    const result = resolveIsSupportedSite("chrome://extensions")

    expect(result).toBe(false)
  })

  it("returns false for chrome-extension:// URL", async () => {
    const { resolveIsSupportedSite } = await import("../../../src/entrypoints/background/runtime")

    const result = resolveIsSupportedSite("chrome-extension://abc123/popup.html")

    expect(result).toBe(false)
  })

  it("returns false for invalid URL string", async () => {
    const { resolveIsSupportedSite } = await import("../../../src/entrypoints/background/runtime")

    const result = resolveIsSupportedSite("not-a-valid-url")

    expect(result).toBe(false)
  })
})

describe("background action icon listeners", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    installBrowserSpies()
    const { registerBackgroundRuntime } = await import("../../../src/entrypoints/background/runtime")
    registerBackgroundRuntime()
  })

  it("updates the icon to grayscale when an unsupported tab refresh completes without a URL change", () => {
    const listener = onUpdatedAddListener.mock.calls[0]?.[0]

    listener?.(
      7,
      { status: "complete" },
      {
        id: 7,
        url: "https://www.google.com/"
      }
    )

    expect(setIconMock).toHaveBeenCalledTimes(1)
    expect(setIconMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tabId: 7,
        path: expect.stringContaining("icon-grayscale")
      })
    )
  })

  it("updates the icon immediately when the tab URL changes to a supported site", () => {
    const listener = onUpdatedAddListener.mock.calls[0]?.[0]

    listener?.(
      8,
      { url: "https://kisssub.org/" },
      {
        id: 8,
        url: "https://kisssub.org/"
      }
    )

    expect(setIconMock).toHaveBeenCalledTimes(1)
    expect(setIconMock).toHaveBeenCalledWith(
      expect.objectContaining({
        tabId: 8,
        path: expect.stringContaining("icon.png")
      })
    )
  })

  it("ignores intermediate tab update events that do not include a URL or completed tab state", () => {
    const listener = onUpdatedAddListener.mock.calls[0]?.[0]

    listener?.(
      9,
      { status: "loading" },
      {
        id: 9,
        url: "https://www.google.com/"
      }
    )

    expect(setIconMock).not.toHaveBeenCalled()
  })
})
