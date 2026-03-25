import { beforeEach, describe, expect, it, vi } from "vitest"

const createRoot = vi.fn(() => ({
  render: vi.fn(),
  unmount: vi.fn()
}))

const runtimeSendMessage = vi.fn()
const runtimeAddListener = vi.fn()
const getSourceAdapterForLocation = vi.fn(() => null)
const getEnabledSourceAdapterForLocation = vi.fn(() => null)

vi.mock("react-dom/client", () => ({
  createRoot
}))

vi.mock("../../components/batch-panel", () => ({
  BatchPanel: () => null
}))

vi.mock("../../components/selection-checkbox", () => ({
  SelectionCheckbox: () => null
}))

vi.mock("../../lib/content-page", () => ({
  getAnchorMountTarget: vi.fn(),
  getBatchItemFromAnchor: vi.fn(),
  getDetailAnchors: vi.fn(() => []),
  getSourceAdapterForLocation,
  getEnabledSourceAdapterForLocation
}))

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
    document.body.innerHTML = ""
    installChromeMock()
  })

  it("provides a default export for the Plasmo content-script wrapper", async () => {
    const module = (await import("../../contents/kisssub")) as Record<string, unknown>

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

    await import("../../contents/kisssub")

    await vi.waitFor(() => {
      expect(runtimeSendMessage).toHaveBeenCalledWith({
        type: "GET_SETTINGS"
      })
    })

    expect(getEnabledSourceAdapterForLocation).toHaveBeenCalledTimes(1)
    expect(createRoot).not.toHaveBeenCalled()
    expect(runtimeAddListener).not.toHaveBeenCalled()
    expect(document.querySelector("[data-kisssub-batch-panel-root]")).toBeNull()
  })

  it("does not inject UI when loading settings fails", async () => {
    getSourceAdapterForLocation.mockReturnValueOnce({
      id: "acgrip",
      displayName: "ACG.RIP"
    })
    runtimeSendMessage.mockRejectedValueOnce(new Error("settings unavailable"))

    await import("../../contents/kisssub")

    await vi.waitFor(() => {
      expect(runtimeSendMessage).toHaveBeenCalledWith({
        type: "GET_SETTINGS"
      })
    })

    expect(getEnabledSourceAdapterForLocation).not.toHaveBeenCalled()
    expect(createRoot).not.toHaveBeenCalled()
    expect(runtimeAddListener).not.toHaveBeenCalled()
    expect(document.querySelector("[data-kisssub-batch-panel-root]")).toBeNull()
  })
})
