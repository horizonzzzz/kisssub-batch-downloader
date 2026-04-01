import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { afterEach, vi } from "vitest"

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver

// Mock Chrome APIs for extension testing - only set if not already defined
if (typeof globalThis.chrome === "undefined") {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    writable: true,
    value: {
      action: {
        setIcon: vi.fn().mockResolvedValue(undefined)
      },
      tabs: {
        query: vi.fn().mockResolvedValue([]),
        get: vi.fn().mockResolvedValue({ id: 1, url: "https://example.com" }),
        onUpdated: {
          addListener: vi.fn()
        },
        onActivated: {
          addListener: vi.fn()
        }
      },
      runtime: {
        onInstalled: {
          addListener: vi.fn()
        },
        onMessage: {
          addListener: vi.fn()
        },
        openOptionsPage: vi.fn().mockResolvedValue(undefined)
      }
    }
  })
}

afterEach(() => {
  cleanup()
})
