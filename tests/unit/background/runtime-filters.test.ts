import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

type RuntimeInstalledListener = Parameters<typeof fakeBrowser.runtime.onInstalled.addListener>[0]
type RuntimeMessageListener = Parameters<typeof fakeBrowser.runtime.onMessage.addListener>[0]
type TabsUpdatedListener = Parameters<typeof fakeBrowser.tabs.onUpdated.addListener>[0]
type TabsActivatedListener = Parameters<typeof fakeBrowser.tabs.onActivated.addListener>[0]

const onMessageAddListener = vi.hoisted(() => vi.fn())
const sendMessageMock = vi.hoisted(() => vi.fn())
const queryTabsMock = vi.hoisted(() => vi.fn(async () => []))

function installBrowserSpies() {
  vi.spyOn(fakeBrowser.runtime.onInstalled, "addListener").mockImplementation(
    (listener: RuntimeInstalledListener) => {}
  )
  vi.spyOn(fakeBrowser.runtime.onMessage, "addListener").mockImplementation(
    (listener: RuntimeMessageListener) => {
      onMessageAddListener(listener)
    }
  )
  vi.spyOn(fakeBrowser.tabs, "query").mockImplementation(queryTabsMock as never)
  vi.spyOn(fakeBrowser.tabs, "sendMessage").mockImplementation(sendMessageMock as never)
  vi.spyOn(fakeBrowser.tabs.onUpdated, "addListener").mockImplementation(
    (listener: TabsUpdatedListener) => {}
  )
  vi.spyOn(fakeBrowser.tabs.onActivated, "addListener").mockImplementation(
    (listener: TabsActivatedListener) => {}
  )
  vi.spyOn(fakeBrowser.tabs.onRemoved, "addListener").mockImplementation(() => {})
}

describe("background runtime filter handlers", () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    fakeBrowser.storage.local.clear()
    installBrowserSpies()
  })

  it("saves filter config and notifies supported tabs", async () => {
    const { registerBackgroundRuntime } = await import(
      "../../../src/entrypoints/background/runtime"
    )
    registerBackgroundRuntime()

    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    listener?.(
      {
        type: "SAVE_FILTER_CONFIG",
        config: {
          rules: []
        }
      },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        ok: true,
        config: {
          rules: []
        }
      })
    })
  })

  it("retrieves filter config from dedicated storage", async () => {
    await fakeBrowser.storage.local.set({
      filter_config: {
        rules: [
          {
            id: "filter-1",
            name: "Stored Filter",
            enabled: true,
            sourceIds: ["kisssub"],
            must: [
              {
                id: "condition-1",
                field: "title",
                operator: "contains",
                value: "1080"
              }
            ],
            any: []
          }
        ]
      }
    })

    const { registerBackgroundRuntime } = await import(
      "../../../src/entrypoints/background/runtime"
    )
    registerBackgroundRuntime()

    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    listener?.(
      {
        type: "GET_FILTER_CONFIG"
      },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        ok: true,
        config: expect.objectContaining({
          rules: expect.arrayContaining([
            expect.objectContaining({
              name: "Stored Filter"
            })
          ])
        })
      })
    })
  })

  it("returns default filter config when storage is empty", async () => {
    const { registerBackgroundRuntime } = await import(
      "../../../src/entrypoints/background/runtime"
    )
    registerBackgroundRuntime()

    const listener = onMessageAddListener.mock.calls[0]?.[0]
    const sendResponse = vi.fn()

    listener?.(
      {
        type: "GET_FILTER_CONFIG"
      },
      {},
      sendResponse
    )

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        ok: true,
        config: {
          rules: []
        }
      })
    })
  })
})