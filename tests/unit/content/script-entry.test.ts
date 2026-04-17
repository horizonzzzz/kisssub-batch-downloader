import { beforeEach, describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"

type RuntimeMessageListener = Parameters<typeof fakeBrowser.runtime.onMessage.addListener>[0]

const FILTERS_ROUTE = "/filters" as const

type MockSource = {
  id: string
  displayName: string
}

const createdRoots: Array<{
  render: ReturnType<typeof vi.fn>
  unmount: ReturnType<typeof vi.fn>
}> = []

const createRoot = vi.fn(() => {
  const root = {
    render: vi.fn(),
    unmount: vi.fn()
  }

  createdRoots.push(root)
  return root
})

const createdUis: Array<{
  host: HTMLElement
  shadow: ShadowRoot
  container: HTMLElement
  ui: {
    mounted?: ReturnType<typeof createRoot>
    mount: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
  }
}> = []

const runtimeSendMessage = vi.fn()
const runtimeAddListener = vi.fn()
const runtimeRemoveListener = vi.fn()
const runtimeGetUrl = vi.fn((path: string) => `chrome-extension://test${path}`)
const getSourceAdapterForLocation = vi.fn((): MockSource | null => null)
const getEnabledSourceAdapterForLocation = vi.fn((): MockSource | null => null)
const getAnchorMountTarget = vi.fn()
const getBatchItemFromAnchor = vi.fn()
const getDetailAnchors = vi.fn((): HTMLAnchorElement[] => [])
const fetchMock = vi.fn()
let bundledContentStyleText = ".anime-bt-content-root { color: rgb(37, 99, 235); }"

vi.mock("react-dom/client", () => ({
  createRoot
}))

vi.mock("../../../src/components/batch-panel", () => ({
  BatchPanel: () => null
}))

const SelectionCheckbox = vi.fn(() => null)

vi.mock("../../../src/components/selection-checkbox", () => ({
  SelectionCheckbox
}))

vi.mock("../../../src/lib/content/page", () => ({
  getAnchorMountTarget,
  getBatchItemFromAnchor,
  getDetailAnchors,
  getSourceAdapterForLocation,
  getEnabledSourceAdapterForLocation
}))

vi.mock("wxt/utils/content-script-ui/shadow-root", () => ({
  createShadowRootUi: vi.fn(async (_ctx, options: any) => {
    const host = document.createElement(options.name)
    const shadow = host.attachShadow({ mode: "open" })
    const style = document.createElement("style")
    style.textContent = options.css ?? bundledContentStyleText
    shadow.appendChild(style)

    const container = document.createElement("div")
    shadow.appendChild(container)

    const anchor =
      typeof options.anchor === "function"
        ? options.anchor()
        : typeof options.anchor === "string"
          ? document.querySelector(options.anchor)
          : options.anchor

    if (!(anchor instanceof HTMLElement)) {
      throw new Error("Expected a concrete HTMLElement anchor in test.")
    }

    switch (options.append) {
      case "first":
        anchor.insertBefore(host, anchor.firstChild)
        break
      case "before":
        anchor.parentNode?.insertBefore(host, anchor)
        break
      case "after":
        anchor.parentNode?.insertBefore(host, anchor.nextSibling)
        break
      case "replace":
        anchor.replaceWith(host)
        break
      case "last":
      default:
        anchor.appendChild(host)
        break
    }

    const mounted = options.onMount(container, shadow, host)
    let mountedState: ReturnType<typeof createRoot> | undefined
    const ui: {
      mount: ReturnType<typeof vi.fn>
      remove: ReturnType<typeof vi.fn>
      autoMount: ReturnType<typeof vi.fn>
      shadowHost: HTMLElement
      shadow: ShadowRoot
      uiContainer: HTMLElement
      mounted?: ReturnType<typeof createRoot>
    } = {
      mount: vi.fn(() => {
        mountedState = mounted
      }),
      remove: vi.fn(() => {
        options.onRemove?.(mountedState)
        host.remove()
        mountedState = undefined
      }),
      autoMount: vi.fn(),
      shadowHost: host,
      shadow,
      uiContainer: container
    }

    Object.defineProperty(ui, "mounted", {
      configurable: true,
      enumerable: true,
      get() {
        return mountedState
      }
    })

    createdUis.push({
      host,
      shadow,
      container,
      ui
    })

    return ui
  })
}))

function installBrowserSpies() {
  vi.spyOn(fakeBrowser.runtime, "sendMessage").mockImplementation(runtimeSendMessage as never)
  vi.spyOn(fakeBrowser.runtime, "getURL").mockImplementation(runtimeGetUrl as never)
  vi.spyOn(fakeBrowser.runtime.onMessage, "addListener").mockImplementation((listener: RuntimeMessageListener) => {
    runtimeAddListener(listener)
  })
  vi.spyOn(fakeBrowser.runtime.onMessage, "removeListener").mockImplementation((listener: RuntimeMessageListener) => {
    runtimeRemoveListener(listener)
  })
}

function createTestContext() {
  return {
    onInvalidated: vi.fn(() => () => undefined),
    setTimeout: (handler: () => void, timeout?: number) => globalThis.setTimeout(handler, timeout)
  }
}

describe("content script runtime", () => {
  const getLatestPanelProps = () => {
    for (let rootIndex = createdRoots.length - 1; rootIndex >= 0; rootIndex -= 1) {
      const calls = createdRoots[rootIndex]?.render.mock.calls ?? []
      for (let callIndex = calls.length - 1; callIndex >= 0; callIndex -= 1) {
        const element = calls[callIndex]?.[0] as
          | { props?: Record<string, unknown> }
          | undefined
        if (element?.props?.onDownload) {
          return element.props as {
            running: boolean
            selectedCount: number
            statusText: string
            onSelectAll: () => void
            onDownload: () => void
            onOpenSettings: () => void
          }
        }
      }
    }

    throw new Error("Panel props were not rendered.")
  }

  const getLatestCheckboxProps = () => {
    for (let rootIndex = createdRoots.length - 1; rootIndex >= 0; rootIndex -= 1) {
      const calls = createdRoots[rootIndex]?.render.mock.calls ?? []
      for (let callIndex = calls.length - 1; callIndex >= 0; callIndex -= 1) {
        const element = calls[callIndex]?.[0] as
          | { props?: Record<string, unknown> }
          | undefined
        if (element?.props?.onChange && "disabledReason" in (element.props ?? {})) {
          return element.props as {
            checked: boolean
            disabled: boolean
            disabledReason: string
          }
        }
      }
    }

    throw new Error("Checkbox props were not rendered.")
  }

  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.clearAllMocks()
    createdRoots.length = 0
    createdUis.length = 0
    document.body.innerHTML = ""
    bundledContentStyleText = ".anime-bt-content-root { color: rgb(37, 99, 235); }"
    installBrowserSpies()
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock
    })
    fetchMock.mockResolvedValue({
      text: vi.fn().mockResolvedValue(bundledContentStyleText)
    })
  })

  it("exports the WXT runtime bootstrap instead of Plasmo entry metadata", async () => {
    const module = (await import("../../../src/entrypoints/source-batch.content/runtime")) as Record<
      string,
      unknown
    >

    expect(module.startSourceBatchContentScript).toBeTypeOf("function")
    expect(module.default).toBeUndefined()
    expect(module.config).toBeUndefined()
  }, 10000)

  it("does not inject UI when the matched source is disabled but still listens for toggle updates", async () => {
    getSourceAdapterForLocation.mockReturnValueOnce({
      id: "acgrip",
      displayName: "ACG.RIP"
    })
    runtimeSendMessage.mockResolvedValue({
      ok: true,
      settings: {
        enabledSources: {
          acgrip: false
        }
      }
    })
    getEnabledSourceAdapterForLocation.mockReturnValueOnce(null)

    const { startSourceBatchContentScript } = await import("../../../src/entrypoints/source-batch.content/runtime")
    await startSourceBatchContentScript(createTestContext() as never)

    expect(runtimeSendMessage).toHaveBeenCalledWith({
      type: "GET_APP_SETTINGS"
    })
    expect(getEnabledSourceAdapterForLocation).toHaveBeenCalledTimes(1)
    expect(createRoot).not.toHaveBeenCalled()
    expect(runtimeAddListener).toHaveBeenCalledTimes(1)
    expect(document.querySelector("[data-anime-bt-batch-panel-root]")).toBeNull()
  })

  it("opens the filters route from the panel settings action", async () => {
    const source = {
      id: "acgrip",
      displayName: "ACG.RIP"
    }

    getSourceAdapterForLocation.mockReturnValueOnce(source)
    getEnabledSourceAdapterForLocation.mockReturnValueOnce(source)
    runtimeSendMessage.mockResolvedValue({
      ok: true,
      settings: {
        enabledSources: {
          acgrip: true
        },
        filters: []
      }
    })

    const { startSourceBatchContentScript } = await import("../../../src/entrypoints/source-batch.content/runtime")
    await startSourceBatchContentScript(createTestContext() as never)

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(1)
    })

    runtimeSendMessage.mockClear()

    getLatestPanelProps().onOpenSettings()

    await vi.waitFor(() => {
      expect(runtimeSendMessage).toHaveBeenCalledWith({
        type: "OPEN_OPTIONS_PAGE",
        route: FILTERS_ROUTE
      })
    })
  })

  it("renders a downloader-agnostic English submitting status during batch submission", async () => {
    ;(globalThis as typeof globalThis & { __animeBtTestLocale?: string }).__animeBtTestLocale = "en"
    const source = {
      id: "acgrip",
      displayName: "ACG.RIP"
    }

    getSourceAdapterForLocation.mockReturnValueOnce(source)
    getEnabledSourceAdapterForLocation.mockReturnValueOnce(source)
    runtimeSendMessage.mockResolvedValue({
      ok: true,
      settings: {
        enabledSources: {
          acgrip: true
        },
        filters: []
      }
    })

    const { startSourceBatchContentScript } = await import("../../../src/entrypoints/source-batch.content/runtime")
    await startSourceBatchContentScript(createTestContext() as never)

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(1)
    })

    const listener = runtimeAddListener.mock.calls[0]?.[0]
    expect(listener).toBeTypeOf("function")

    listener?.({
      type: "ANIME_BT_BATCH_EVENT",
      stage: "submitting",
      stats: {
        total: 2,
        processed: 2,
        prepared: 2,
        submitted: 0,
        duplicated: 0,
        failed: 0
      }
    })

    expect(getLatestPanelProps().statusText).toBe("Submitting to the current downloader. 2 item(s) are queued.")
  })

  it("renders a Chinese tooltip for unmatched disabled checkboxes", async () => {
    const anchorCell = document.createElement("td")
    const anchor = document.createElement("a")
    anchor.href = "https://acg.rip/t/2"
    anchor.textContent = "Episode 02"
    anchorCell.appendChild(anchor)
    document.body.appendChild(anchorCell)

    const source = {
      id: "acgrip",
      displayName: "ACG.RIP"
    }

    getSourceAdapterForLocation.mockReturnValueOnce(source)
    getEnabledSourceAdapterForLocation.mockReturnValueOnce(source)
    getDetailAnchors.mockReturnValueOnce([anchor])
    getBatchItemFromAnchor.mockReturnValueOnce({
      sourceId: "acgrip",
      title: "[LoliHouse] Episode 02 [720p]",
      detailUrl: "https://acg.rip/t/2"
    })
    getAnchorMountTarget.mockReturnValueOnce(anchorCell)
    runtimeSendMessage.mockResolvedValue({
      ok: true,
      settings: {
        enabledSources: {
          acgrip: true
        },
        filters: [
          {
            id: "filter-1",
            name: "仅保留爱恋",
            enabled: true,
            sourceIds: ["acgrip"],
            must: [
              {
                id: "condition-1",
                field: "subgroup",
                operator: "contains",
                value: "爱恋字幕社"
              }
            ],
            any: []
          }
        ]
      }
    })

    const { startSourceBatchContentScript } = await import("../../../src/entrypoints/source-batch.content/runtime")
    await startSourceBatchContentScript(createTestContext() as never)

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(2)
    })

    expect(getLatestCheckboxProps()).toMatchObject({
      disabled: true,
      disabledReason: "该条目未命中当前筛选规则，无法选择"
    })
  })

  it("reloads filters and re-enables previously blocked items when filter settings update", async () => {
    const anchorCell = document.createElement("td")
    const anchor = document.createElement("a")
    anchor.href = "https://acg.rip/t/4"
    anchor.textContent = "Episode 04"
    anchorCell.appendChild(anchor)
    document.body.appendChild(anchorCell)

    const source = {
      id: "acgrip",
      displayName: "ACG.RIP"
    }
    const item = {
      sourceId: "acgrip",
      title: "[LoliHouse] Episode 04 [1080p]",
      detailUrl: "https://acg.rip/t/4"
    }

    getSourceAdapterForLocation.mockReturnValueOnce(source)
    getEnabledSourceAdapterForLocation.mockReturnValue(source)
    getDetailAnchors.mockReturnValue([anchor])
    getBatchItemFromAnchor.mockReturnValue(item)
    getAnchorMountTarget.mockReturnValue(anchorCell)

    runtimeSendMessage.mockImplementation(({ type }) => {
      if (type === "GET_APP_SETTINGS") {
        const callCount = runtimeSendMessage.mock.calls.filter((call) => call[0]?.type === "GET_APP_SETTINGS").length

        if (callCount <= 1) {
          return Promise.resolve({
            ok: true,
            settings: {
              enabledSources: {
                acgrip: true
              },
              filters: [
                {
                  id: "filter-1",
                  name: "仅保留爱恋",
                  enabled: true,
                  sourceIds: ["acgrip"],
                  must: [
                    {
                      id: "condition-1",
                      field: "subgroup",
                      operator: "contains",
                      value: "爱恋字幕社"
                    }
                  ],
                  any: []
                }
              ]
            }
          })
        }

        return Promise.resolve({
          ok: true,
          settings: {
            enabledSources: {
              acgrip: true
            },
            filters: []
          }
        })
      }

      return Promise.resolve({ ok: true })
    })

    const { startSourceBatchContentScript } = await import("../../../src/entrypoints/source-batch.content/runtime")
    await startSourceBatchContentScript(createTestContext() as never)

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(2)
    })

    expect(getLatestCheckboxProps()).toMatchObject({
      disabled: true,
      disabledReason: "该条目未命中当前筛选规则，无法选择"
    })

    const listener = runtimeAddListener.mock.calls[0]?.[0]
    listener?.({
      type: "ANIME_BT_FILTERS_UPDATED_EVENT"
    })

    await vi.waitFor(() => {
      expect(runtimeSendMessage.mock.calls.filter((call) => call[0]?.type === "GET_APP_SETTINGS")).toHaveLength(2)
      expect(getLatestCheckboxProps()).toMatchObject({
        disabled: false
      })
    })
  })

  it("mounts the panel and checkbox inside shadow-root hosts when the source is enabled", async () => {
    const anchorCell = document.createElement("td")
    const anchor = document.createElement("a")
    anchor.href = "https://acg.rip/t/1"
    anchor.textContent = "Episode 01"
    anchorCell.appendChild(anchor)
    document.body.appendChild(anchorCell)

    const source = {
      id: "acgrip",
      displayName: "ACG.RIP"
    }

    getSourceAdapterForLocation.mockReturnValueOnce(source)
    getEnabledSourceAdapterForLocation.mockReturnValueOnce(source)
    getDetailAnchors.mockReturnValueOnce([anchor])
    getBatchItemFromAnchor.mockReturnValueOnce({
      title: "Episode 01",
      detailUrl: "https://acg.rip/t/1"
    })
    getAnchorMountTarget.mockReturnValueOnce(anchorCell)
    runtimeSendMessage.mockResolvedValue({
      ok: true,
      settings: {
        enabledSources: {
          acgrip: true
        }
      }
    })

    const { startSourceBatchContentScript } = await import("../../../src/entrypoints/source-batch.content/runtime")
    await startSourceBatchContentScript(createTestContext() as never)

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(2)
    })

    const panelHost = document.querySelector("[data-anime-bt-batch-panel-root='1']")
    const checkboxHost = document.querySelector("[data-anime-bt-batch-checkbox-root='1']")

    expect(panelHost?.shadowRoot).not.toBeNull()
    expect(checkboxHost?.shadowRoot).not.toBeNull()
    expect(anchor.dataset.animeBtBatchDecorated).toBe("1")
    expect(runtimeAddListener).toHaveBeenCalledTimes(1)
  })

  it("injects the bundled contents stylesheet into both shadow roots through the WXT UI helper", async () => {
    const anchorCell = document.createElement("td")
    const anchor = document.createElement("a")
    anchor.href = "https://acg.rip/t/1"
    anchor.textContent = "Episode 01"
    anchorCell.appendChild(anchor)
    document.body.appendChild(anchorCell)

    const source = {
      id: "acgrip",
      displayName: "ACG.RIP"
    }

    getSourceAdapterForLocation.mockReturnValueOnce(source)
    getEnabledSourceAdapterForLocation.mockReturnValueOnce(source)
    getDetailAnchors.mockReturnValueOnce([anchor])
    getBatchItemFromAnchor.mockReturnValueOnce({
      title: "Episode 01",
      detailUrl: "https://acg.rip/t/1"
    })
    getAnchorMountTarget.mockReturnValueOnce(anchorCell)
    runtimeSendMessage.mockResolvedValue({
      ok: true,
      settings: {
        enabledSources: {
          acgrip: true
        }
      }
    })

    const { startSourceBatchContentScript } = await import("../../../src/entrypoints/source-batch.content/runtime")
    await startSourceBatchContentScript(createTestContext() as never)

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(2)
    })

    const panelHost = document.querySelector("[data-anime-bt-batch-panel-root='1']")
    const checkboxHost = document.querySelector("[data-anime-bt-batch-checkbox-root='1']")

    expect(panelHost?.shadowRoot?.textContent).toContain(".anime-bt-content-root")
    expect(checkboxHost?.shadowRoot?.textContent).toContain(".anime-bt-content-root")
  })

  it("loads the bundled stylesheet once and reuses it across the panel and multiple checkboxes", async () => {
    const firstCell = document.createElement("td")
    const firstAnchor = document.createElement("a")
    firstAnchor.href = "https://acg.rip/t/1"
    firstAnchor.textContent = "Episode 01"
    firstCell.appendChild(firstAnchor)
    document.body.appendChild(firstCell)

    const secondCell = document.createElement("td")
    const secondAnchor = document.createElement("a")
    secondAnchor.href = "https://acg.rip/t/2"
    secondAnchor.textContent = "Episode 02"
    secondCell.appendChild(secondAnchor)
    document.body.appendChild(secondCell)

    const source = {
      id: "acgrip",
      displayName: "ACG.RIP"
    }

    getSourceAdapterForLocation.mockReturnValueOnce(source)
    getEnabledSourceAdapterForLocation.mockReturnValueOnce(source)
    getDetailAnchors.mockReturnValueOnce([firstAnchor, secondAnchor])
    getBatchItemFromAnchor
      .mockReturnValueOnce({
        title: "Episode 01",
        detailUrl: "https://acg.rip/t/1"
      })
      .mockReturnValueOnce({
        title: "Episode 02",
        detailUrl: "https://acg.rip/t/2"
      })
    getAnchorMountTarget.mockReturnValueOnce(firstCell).mockReturnValueOnce(secondCell)
    runtimeSendMessage.mockResolvedValue({
      ok: true,
      settings: {
        enabledSources: {
          acgrip: true
        }
      }
    })

    const { startSourceBatchContentScript } = await import("../../../src/entrypoints/source-batch.content/runtime")
    await startSourceBatchContentScript(createTestContext() as never)

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(3)
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith("chrome-extension://test/content-scripts/source-batch.css")
    expect(createdUis).toHaveLength(3)
    expect(createdUis.every(({ shadow }) => shadow.textContent?.includes(".anime-bt-content-root"))).toBe(true)
  })

  it("tears down injected UI when the current source is disabled from the popup and rebuilds it when re-enabled", async () => {
    const anchorCell = document.createElement("td")
    const anchor = document.createElement("a")
    anchor.href = "https://acg.rip/t/1"
    anchor.textContent = "Episode 01"
    anchorCell.appendChild(anchor)
    document.body.appendChild(anchorCell)

    const source = {
      id: "acgrip",
      displayName: "ACG.RIP"
    }
    const item = {
      title: "Episode 01",
      detailUrl: "https://acg.rip/t/1"
    }

    getSourceAdapterForLocation.mockReturnValueOnce(source)
    getEnabledSourceAdapterForLocation.mockReturnValueOnce(source)
    getDetailAnchors.mockReturnValueOnce([anchor])
    getBatchItemFromAnchor.mockReturnValueOnce(item)
    getAnchorMountTarget.mockReturnValueOnce(anchorCell)
    runtimeSendMessage.mockResolvedValue({
      ok: true,
      settings: {
        enabledSources: {
          acgrip: true
        }
      }
    })

    const { startSourceBatchContentScript } = await import("../../../src/entrypoints/source-batch.content/runtime")
    await startSourceBatchContentScript(createTestContext() as never)

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(2)
    })

    const listener = runtimeAddListener.mock.calls[0]?.[0]
    expect(listener).toBeTypeOf("function")

    listener?.({
      type: "ANIME_BT_SOURCE_ENABLED_CHANGE_EVENT",
      sourceId: "acgrip",
      enabled: false
    })

    expect(createdRoots[0]?.unmount).toHaveBeenCalledTimes(1)
    expect(createdRoots[1]?.unmount).toHaveBeenCalledTimes(1)
    expect(document.querySelector("[data-anime-bt-batch-panel-root='1']")).toBeNull()
    expect(document.querySelector("[data-anime-bt-batch-checkbox-root='1']")).toBeNull()
    expect(anchor.dataset.animeBtBatchDecorated).toBeUndefined()

    getDetailAnchors.mockReturnValueOnce([anchor])
    getBatchItemFromAnchor.mockReturnValueOnce(item)
    getAnchorMountTarget.mockReturnValueOnce(anchorCell)

    listener?.({
      type: "ANIME_BT_SOURCE_ENABLED_CHANGE_EVENT",
      sourceId: "acgrip",
      enabled: true
    })

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(4)
    })

    expect(document.querySelector("[data-anime-bt-batch-panel-root='1']")).not.toBeNull()
    expect(document.querySelector("[data-anime-bt-batch-checkbox-root='1']")).not.toBeNull()
    expect(anchor.dataset.animeBtBatchDecorated).toBe("1")
    expect(getLatestPanelProps().running).toBe(false)
    expect(getLatestPanelProps().statusText).toBe("就绪。先在当前列表页勾选资源。")
  })

  it("preserves in-flight running state when disabling and re-enabling the current source", async () => {
    const anchorCell = document.createElement("td")
    const anchor = document.createElement("a")
    anchor.href = "https://acg.rip/t/3"
    anchor.textContent = "Episode 03"
    anchorCell.appendChild(anchor)
    document.body.appendChild(anchorCell)

    const source = {
      id: "acgrip",
      displayName: "ACG.RIP"
    }
    const item = {
      title: "Episode 03",
      detailUrl: "https://acg.rip/t/3"
    }

    getSourceAdapterForLocation.mockReturnValueOnce(source)
    getEnabledSourceAdapterForLocation.mockReturnValueOnce(source)
    getDetailAnchors.mockReturnValueOnce([anchor])
    getBatchItemFromAnchor.mockReturnValueOnce(item)
    getAnchorMountTarget.mockReturnValueOnce(anchorCell)
    runtimeSendMessage.mockImplementation(({ type }) => {
      if (type === "GET_APP_SETTINGS") {
        return Promise.resolve({
          ok: true,
          settings: {
            enabledSources: {
              acgrip: true
            }
          }
        })
      }

      if (type === "START_BATCH_DOWNLOAD") {
        return new Promise(() => {})
      }

      return Promise.resolve({ ok: true })
    })

    const { startSourceBatchContentScript } = await import("../../../src/entrypoints/source-batch.content/runtime")
    await startSourceBatchContentScript(createTestContext() as never)

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(2)
    })

    const listener = runtimeAddListener.mock.calls[0]?.[0]
    const initialPanel = getLatestPanelProps()
    initialPanel.onSelectAll()
    getLatestPanelProps().onDownload()

    await vi.waitFor(() => {
      expect(getLatestPanelProps().running).toBe(true)
    })

    const statusBeforeDisable = getLatestPanelProps().statusText
    expect(statusBeforeDisable).not.toBe("就绪。先在当前列表页勾选资源。")

    listener?.({
      type: "ANIME_BT_SOURCE_ENABLED_CHANGE_EVENT",
      sourceId: "acgrip",
      enabled: false
    })

    expect(document.querySelector("[data-anime-bt-batch-panel-root='1']")).toBeNull()
    expect(document.querySelector("[data-anime-bt-batch-checkbox-root='1']")).toBeNull()

    getDetailAnchors.mockReturnValueOnce([anchor])
    getBatchItemFromAnchor.mockReturnValueOnce(item)
    getAnchorMountTarget.mockReturnValueOnce(anchorCell)

    listener?.({
      type: "ANIME_BT_SOURCE_ENABLED_CHANGE_EVENT",
      sourceId: "acgrip",
      enabled: true
    })

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(4)
      expect(getLatestPanelProps().running).toBe(true)
    })

    expect(getLatestPanelProps().statusText).toBe(statusBeforeDisable)
  })
})
