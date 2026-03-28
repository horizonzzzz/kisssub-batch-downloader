import { beforeEach, describe, expect, it, vi } from "vitest"

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
const getDocumentStylesheetText = vi.fn()

let documentStyleText = ".anime-bt-content-root { color: rgb(37, 99, 235); }"
let bundledContentStyleText = ".anime-bt-content-root { color: rgb(37, 99, 235); }"

vi.mock("react-dom/client", () => ({
  createRoot
}))

vi.mock("../../components/batch-panel", () => ({
  BatchPanel: () => null
}))

vi.mock("../../components/selection-checkbox", () => ({
  SelectionCheckbox: () => null
}))

vi.mock("../../lib/content/page", () => ({
  getAnchorMountTarget,
  getBatchItemFromAnchor,
  getDetailAnchors,
  getSourceAdapterForLocation,
  getEnabledSourceAdapterForLocation
}))

vi.mock("../../styles/content-style-text", () => ({
  default: bundledContentStyleText
}))

vi.mock("../../lib/content/shadow-root", async () => {
  const actual = await vi.importActual<typeof import("../../lib/content/shadow-root")>(
    "../../lib/content/shadow-root"
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
    },
    getDocumentStylesheetText
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
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    createdRoots.length = 0
    document.body.innerHTML = ""
    documentStyleText = ".anime-bt-content-root { color: rgb(37, 99, 235); }"
    bundledContentStyleText = ".anime-bt-content-root { color: rgb(37, 99, 235); }"
    getDocumentStylesheetText.mockImplementation(() => documentStyleText)
    installChromeMock()
  })

  it("provides a default export for the Plasmo content-script wrapper", async () => {
    const module = (await import("../../contents/source-batch")) as Record<string, unknown>

    expect(module.default).toBeTypeOf("function")
  })

  it("does not inject UI when the matched source is disabled", async () => {
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

    await import("../../contents/source-batch")

    await vi.waitFor(() => {
      expect(runtimeSendMessage).toHaveBeenCalledWith({
        type: "GET_SETTINGS"
      })
    })

    expect(getEnabledSourceAdapterForLocation).toHaveBeenCalledTimes(1)
    expect(createRoot).not.toHaveBeenCalled()
    expect(runtimeAddListener).not.toHaveBeenCalled()
    expect(document.querySelector("[data-anime-bt-batch-panel-root]")).toBeNull()
  })

  it("does not inject UI when loading settings fails", async () => {
    getSourceAdapterForLocation.mockReturnValueOnce({
      id: "acgrip",
      displayName: "ACG.RIP"
    })
    runtimeSendMessage.mockRejectedValueOnce(new Error("settings unavailable"))

    await import("../../contents/source-batch")

    await vi.waitFor(() => {
      expect(runtimeSendMessage).toHaveBeenCalledWith({
        type: "GET_SETTINGS"
      })
    })

    expect(getEnabledSourceAdapterForLocation).not.toHaveBeenCalled()
    expect(createRoot).not.toHaveBeenCalled()
    expect(runtimeAddListener).not.toHaveBeenCalled()
    expect(document.querySelector("[data-anime-bt-batch-panel-root]")).toBeNull()
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

    await import("../../contents/source-batch")

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

  it("injects styles into shadow roots without relying on document stylesheets", async () => {
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

    documentStyleText = ""
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

    await import("../../contents/source-batch")

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
  })
})
