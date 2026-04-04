import { beforeEach, describe, expect, it, vi } from "vitest"
import { CONTENT_SCRIPT_MATCH_PATTERNS } from "../../../lib/sources/matching"

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

const runtimeSendMessage = vi.fn()
const runtimeAddListener = vi.fn()
const getSourceAdapterForLocation = vi.fn((): MockSource | null => null)
const getEnabledSourceAdapterForLocation = vi.fn((): MockSource | null => null)
const getAnchorMountTarget = vi.fn()
const getBatchItemFromAnchor = vi.fn()
const getDetailAnchors = vi.fn((): HTMLAnchorElement[] => [])
let bundledContentStyleText = ".anime-bt-content-root { color: rgb(37, 99, 235); }"

vi.mock("react-dom/client", () => ({
  createRoot
}))

vi.mock("../../../components/batch-panel", () => ({
  BatchPanel: () => null
}))

const SelectionCheckbox = vi.fn(() => null)

vi.mock("../../../components/selection-checkbox", () => ({
  SelectionCheckbox
}))

vi.mock("../../../lib/content/page", () => ({
  getAnchorMountTarget,
  getBatchItemFromAnchor,
  getDetailAnchors,
  getSourceAdapterForLocation,
  getEnabledSourceAdapterForLocation
}))

vi.mock("../../../styles/content-style-text", () => ({
  default: bundledContentStyleText
}))

vi.mock("../../../lib/content/shadow-root", async () => {
  const actual = await vi.importActual<typeof import("../../../lib/content/shadow-root")>(
    "../../../lib/content/shadow-root"
  )

  return {
    ...actual,
    ensureShadowStyle: (shadowRoot: ShadowRoot, styleId: string, styleText: string) => {
      if (!styleText) {
        return null
      }

      const selector = `[data-anime-bt-batch-shadow-style="${styleId}"]`
      const existing = shadowRoot.querySelector(selector)
      if (existing) {
        return existing
      }

      const style = document.createElement("style")
      style.dataset.animeBtBatchShadowStyle = styleId
      style.textContent = styleText
      shadowRoot.prepend(style)
      return style
    }
  }
})

function installChromeMock() {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        sendMessage: runtimeSendMessage,
        onMessage: {
          addListener: runtimeAddListener
        }
      }
    }
  })
}

describe("content script entry", () => {
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
    vi.clearAllMocks()
    createdRoots.length = 0
    document.body.innerHTML = ""
    bundledContentStyleText = ".anime-bt-content-root { color: rgb(37, 99, 235); }"
    installChromeMock()
  })

  it("provides a default export for the Plasmo content-script wrapper", async () => {
    const module = (await import("../../../contents/source-batch")) as Record<string, unknown>

    expect(module.default).toBeTypeOf("function")
  })

  it("registers shared wildcard host match patterns for all supported sources", async () => {
    const module = (await import("../../../contents/source-batch")) as {
      config?: { matches?: string[] }
    }

    expect(module.config?.matches).toEqual(CONTENT_SCRIPT_MATCH_PATTERNS)
  })

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

    await import("../../../contents/source-batch")

    await vi.waitFor(() => {
      expect(runtimeSendMessage).toHaveBeenCalledWith({
        type: "GET_SETTINGS"
      })
    })

    expect(getEnabledSourceAdapterForLocation).toHaveBeenCalledTimes(1)
    expect(createRoot).not.toHaveBeenCalled()
    expect(runtimeAddListener).toHaveBeenCalledTimes(1)
    expect(document.querySelector("[data-anime-bt-batch-panel-root]")).toBeNull()
  })

  it("does not inject UI when loading settings fails", async () => {
    getSourceAdapterForLocation.mockReturnValueOnce({
      id: "acgrip",
      displayName: "ACG.RIP"
    })
    runtimeSendMessage.mockRejectedValueOnce(new Error("settings unavailable"))

    await import("../../../contents/source-batch")

    await vi.waitFor(() => {
      expect(runtimeSendMessage).toHaveBeenCalledWith({
        type: "GET_SETTINGS"
      })
    })

    expect(getEnabledSourceAdapterForLocation).not.toHaveBeenCalled()
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

    await import("../../../contents/source-batch")

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

    await import("../../../contents/source-batch")

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
      if (type === "GET_SETTINGS") {
        const callCount = runtimeSendMessage.mock.calls.filter((call) => call[0]?.type === "GET_SETTINGS").length

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

    await import("../../../contents/source-batch")

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
      expect(runtimeSendMessage.mock.calls.filter((call) => call[0]?.type === "GET_SETTINGS")).toHaveLength(2)
      expect(getLatestCheckboxProps()).toMatchObject({
        disabled: false
      })
    })
  })

  it("drops stale selections when updated filters make an item ineligible", async () => {
    const anchorCell = document.createElement("td")
    const anchor = document.createElement("a")
    anchor.href = "https://acg.rip/t/5"
    anchor.textContent = "Episode 05"
    anchorCell.appendChild(anchor)
    document.body.appendChild(anchorCell)

    const source = {
      id: "acgrip",
      displayName: "ACG.RIP"
    }
    const item = {
      sourceId: "acgrip",
      title: "[LoliHouse] Episode 05 [1080p]",
      detailUrl: "https://acg.rip/t/5"
    }

    getSourceAdapterForLocation.mockReturnValueOnce(source)
    getEnabledSourceAdapterForLocation.mockReturnValue(source)
    getDetailAnchors.mockReturnValue([anchor])
    getBatchItemFromAnchor.mockReturnValue(item)
    getAnchorMountTarget.mockReturnValue(anchorCell)

    runtimeSendMessage.mockImplementation(({ type }) => {
      if (type === "GET_SETTINGS") {
        const callCount = runtimeSendMessage.mock.calls.filter((call) => call[0]?.type === "GET_SETTINGS").length

        if (callCount <= 1) {
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

      return Promise.resolve({ ok: true })
    })

    await import("../../../contents/source-batch")

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(2)
    })

    const initialPanel = getLatestPanelProps()
    initialPanel.onSelectAll()

    await vi.waitFor(() => {
      expect(getLatestPanelProps().selectedCount).toBe(1)
      expect(getLatestCheckboxProps().checked).toBe(true)
      expect(getLatestCheckboxProps().disabled).toBe(false)
    })

    const listener = runtimeAddListener.mock.calls[0]?.[0]
    listener?.({
      type: "ANIME_BT_FILTERS_UPDATED_EVENT"
    })

    await vi.waitFor(() => {
      expect(runtimeSendMessage.mock.calls.filter((call) => call[0]?.type === "GET_SETTINGS")).toHaveLength(2)
      expect(getLatestCheckboxProps()).toMatchObject({
        checked: false,
        disabled: true
      })
      expect(getLatestPanelProps().selectedCount).toBe(0)
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

    await import("../../../contents/source-batch")

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(2)
    })

    const panelHost = document.querySelector("[data-anime-bt-batch-panel-root='1']")
    const checkboxHost = document.querySelector("[data-anime-bt-batch-checkbox-root='1']")

    expect(panelHost).toBeInstanceOf(HTMLDivElement)
    expect(panelHost?.shadowRoot).not.toBeNull()
    expect(checkboxHost).toBeInstanceOf(HTMLSpanElement)
    expect(checkboxHost?.shadowRoot).not.toBeNull()
    expect(createdRoots).toHaveLength(2)
    expect(createdRoots[0]?.render.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(createdRoots[1]?.render).toHaveBeenCalledTimes(1)
    expect(anchor.dataset.animeBtBatchDecorated).toBe("1")
    expect(runtimeAddListener).toHaveBeenCalledTimes(1)
  })

  it("injects the bundled contents stylesheet into both shadow roots", async () => {
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

    bundledContentStyleText = ".anime-bt-content-root { color: rgb(37, 99, 235); }"

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

    await import("../../../contents/source-batch")

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(2)
    })

    const panelHost = document.querySelector("[data-anime-bt-batch-panel-root='1']")
    const checkboxHost = document.querySelector("[data-anime-bt-batch-checkbox-root='1']")

    expect(
      panelHost?.shadowRoot?.querySelector("[data-anime-bt-batch-shadow-style='content-ui']")
    ).not.toBeNull()
    expect(
      checkboxHost?.shadowRoot?.querySelector("[data-anime-bt-batch-shadow-style='content-ui']")
    ).not.toBeNull()
    expect(panelHost?.shadowRoot?.textContent).toContain(".anime-bt-content-root")
    expect(checkboxHost?.shadowRoot?.textContent).toContain(".anime-bt-content-root")
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

    await import("../../../contents/source-batch")

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

  it("can inject UI when the page started disabled and the popup re-enables the same source", async () => {
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
    getEnabledSourceAdapterForLocation.mockReturnValueOnce(null)
    runtimeSendMessage.mockResolvedValue({
      ok: true,
      settings: {
        enabledSources: {
          acgrip: false
        }
      }
    })

    await import("../../../contents/source-batch")

    await vi.waitFor(() => {
      expect(runtimeAddListener).toHaveBeenCalledTimes(1)
    })

    const listener = runtimeAddListener.mock.calls[0]?.[0]
    getDetailAnchors.mockReturnValueOnce([anchor])
    getBatchItemFromAnchor.mockReturnValueOnce({
      title: "Episode 02",
      detailUrl: "https://acg.rip/t/2"
    })
    getAnchorMountTarget.mockReturnValueOnce(anchorCell)

    listener?.({
      type: "ANIME_BT_SOURCE_ENABLED_CHANGE_EVENT",
      sourceId: "acgrip",
      enabled: true
    })

    await vi.waitFor(() => {
      expect(createRoot).toHaveBeenCalledTimes(2)
    })

    expect(document.querySelector("[data-anime-bt-batch-panel-root='1']")).not.toBeNull()
    expect(document.querySelector("[data-anime-bt-batch-checkbox-root='1']")).not.toBeNull()
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
      if (type === "GET_SETTINGS") {
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

    await import("../../../contents/source-batch")

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
