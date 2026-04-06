import { beforeEach, describe, expect, it, vi } from "vitest"

import { withDetailTab } from "../../../src/lib/sources/detail-tab"

type UpdatedListener = (
  updatedTabId: number,
  changeInfo: { status?: string },
  tab: chrome.tabs.Tab
) => void

function createChromeTabsMock() {
  let listeners: UpdatedListener[] = []

  return {
    listeners,
    chrome: {
      tabs: {
        create: vi.fn(),
        get: vi.fn(),
        remove: vi.fn(),
        onUpdated: {
          addListener: vi.fn((listener: UpdatedListener) => {
            listeners.push(listener)
          }),
          removeListener: vi.fn((listener: UpdatedListener) => {
            listeners = listeners.filter((candidate) => candidate !== listener)
          })
        }
      }
    },
    emitUpdated(tabId: number, status: string, tab: Partial<chrome.tabs.Tab> = {}) {
      for (const listener of listeners) {
        listener(tabId, { status }, { id: tabId, status, ...tab } as chrome.tabs.Tab)
      }
    }
  }
}

describe("withDetailTab", () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it("runs the extraction immediately when the tab is already complete", async () => {
    const tabsMock = createChromeTabsMock()
    tabsMock.chrome.tabs.create.mockResolvedValue({ id: 21 } as chrome.tabs.Tab)
    tabsMock.chrome.tabs.get.mockResolvedValue({ id: 21, status: "complete" } as chrome.tabs.Tab)
    tabsMock.chrome.tabs.remove.mockResolvedValue(undefined)
    globalThis.chrome = tabsMock.chrome as unknown as typeof chrome

    const run = vi.fn().mockResolvedValue("ok")

    await expect(withDetailTab("https://example.com/detail", 5000, run)).resolves.toBe("ok")

    expect(run).toHaveBeenCalledWith(21)
    expect(tabsMock.chrome.tabs.remove).toHaveBeenCalledWith(21)
  })

  it("waits for the tab to finish loading before running the extraction", async () => {
    const tabsMock = createChromeTabsMock()
    tabsMock.chrome.tabs.create.mockResolvedValue({ id: 34 } as chrome.tabs.Tab)
    tabsMock.chrome.tabs.get.mockResolvedValue({ id: 34, status: "loading" } as chrome.tabs.Tab)
    tabsMock.chrome.tabs.remove.mockResolvedValue(undefined)
    globalThis.chrome = tabsMock.chrome as unknown as typeof chrome

    const run = vi.fn().mockResolvedValue("loaded")
    const promise = withDetailTab("https://example.com/detail", 5000, run)

    expect(run).not.toHaveBeenCalled()

    await Promise.resolve()
    tabsMock.emitUpdated(34, "complete")

    await expect(promise).resolves.toBe("loaded")
    expect(run).toHaveBeenCalledWith(34)
  })

  it("rejects when the background detail tab never finishes loading", async () => {
    vi.useFakeTimers()
    const tabsMock = createChromeTabsMock()
    tabsMock.chrome.tabs.create.mockResolvedValue({ id: 55 } as chrome.tabs.Tab)
    tabsMock.chrome.tabs.get.mockResolvedValue({ id: 55, status: "loading" } as chrome.tabs.Tab)
    tabsMock.chrome.tabs.remove.mockResolvedValue(undefined)
    globalThis.chrome = tabsMock.chrome as unknown as typeof chrome

    const run = vi.fn()
    const promise = withDetailTab("https://example.com/detail", 1000, run)
    const assertion = expect(promise).rejects.toThrow("Timed out waiting for the detail tab to finish loading.")

    await vi.advanceTimersByTimeAsync(1000)

    await assertion
    expect(run).not.toHaveBeenCalled()
    expect(tabsMock.chrome.tabs.remove).toHaveBeenCalledWith(55)
  })

  it("rejects when the created tab can no longer be queried", async () => {
    const tabsMock = createChromeTabsMock()
    tabsMock.chrome.tabs.create.mockResolvedValue({ id: 89 } as chrome.tabs.Tab)
    tabsMock.chrome.tabs.get.mockRejectedValue(new Error("missing"))
    tabsMock.chrome.tabs.remove.mockResolvedValue(undefined)
    globalThis.chrome = tabsMock.chrome as unknown as typeof chrome

    await expect(withDetailTab("https://example.com/detail", 5000, vi.fn())).rejects.toThrow(
      "The background detail tab could not be opened."
    )
    expect(tabsMock.chrome.tabs.remove).toHaveBeenCalledWith(89)
  })

  it("ignores remove failures when the tab was already closed", async () => {
    const tabsMock = createChromeTabsMock()
    tabsMock.chrome.tabs.create.mockResolvedValue({ id: 144 } as chrome.tabs.Tab)
    tabsMock.chrome.tabs.get.mockResolvedValue({ id: 144, status: "complete" } as chrome.tabs.Tab)
    tabsMock.chrome.tabs.remove.mockRejectedValue(new Error("gone"))
    globalThis.chrome = tabsMock.chrome as unknown as typeof chrome

    await expect(withDetailTab("https://example.com/detail", 5000, vi.fn().mockResolvedValue("ok"))).resolves.toBe(
      "ok"
    )
  })
})
