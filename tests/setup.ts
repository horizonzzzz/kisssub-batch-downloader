import "@testing-library/jest-dom/vitest"
import { cleanup } from "@testing-library/react"
import { fakeBrowser } from "wxt/testing/fake-browser"
import { afterEach, beforeEach, vi } from "vitest"

import enMessages from "../src/locales/en.json"
import zhCnMessages from "../src/locales/zh_CN.json"

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

type LocaleMessages = Record<string, string>

function flattenLocaleMessages(input: unknown, prefix = ""): LocaleMessages {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {}
  }

  return Object.entries(input as Record<string, unknown>).reduce<LocaleMessages>((acc, [key, value]) => {
    const nextKey = prefix ? `${prefix}_${key}` : key

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "message" in value &&
      Object.keys(value as Record<string, unknown>).every((entryKey) =>
        ["message", "description", "placeholders"].includes(entryKey)
      )
    ) {
      acc[nextKey] = String((value as { message: unknown }).message)
      return acc
    }

    if (typeof value === "string") {
      acc[nextKey] = value
      return acc
    }

    Object.assign(acc, flattenLocaleMessages(value, nextKey))
    return acc
  }, {})
}

const LOCALE_MESSAGES: Record<string, LocaleMessages> = {
  en: flattenLocaleMessages(enMessages),
  zh_CN: flattenLocaleMessages(zhCnMessages),
  zh: flattenLocaleMessages(zhCnMessages)
}

let extensionApi = fakeBrowser as typeof fakeBrowser
let activeLocale = "zh_CN"

const i18n = {
  getMessage(messageName: string, substitutions?: string | Array<string | number>) {
    const messages = resolveLocaleMessages(activeLocale)
    const template = messages[messageName] ?? ""
    const values = Array.isArray(substitutions)
      ? substitutions.map(String)
      : typeof substitutions === "undefined"
        ? []
        : [String(substitutions)]

    return values.reduce(
      (message, substitution, index) => message.replaceAll(`$${index + 1}`, substitution),
      template
    )
  },
  getUILanguage() {
    return activeLocale
  }
}

function resolveLocaleMessages(language: string | undefined): LocaleMessages {
  if (!language) {
    return LOCALE_MESSAGES.zh_CN
  }

  if (language.startsWith("en")) {
    return LOCALE_MESSAGES.en
  }

  return LOCALE_MESSAGES.zh_CN
}

function installExtensionGlobals() {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    get() {
      return extensionApi
    },
    set(value) {
      extensionApi = value as typeof fakeBrowser
    }
  })

  Object.defineProperty(globalThis, "browser", {
    configurable: true,
    get() {
      return extensionApi
    },
    set(value) {
      extensionApi = value as typeof fakeBrowser
    }
  })

  Object.defineProperty(globalThis.chrome, "i18n", {
    configurable: true,
    value: i18n
  })
  Object.defineProperty((globalThis as typeof globalThis & { browser: object }).browser, "i18n", {
    configurable: true,
    value: i18n
  })

  Object.defineProperty(globalThis, "__animeBtTestLocale", {
    configurable: true,
    get() {
      return activeLocale
    },
    set(value) {
      activeLocale = typeof value === "string" ? value : "zh_CN"
    }
  })
}

installExtensionGlobals()

beforeEach(() => {
  fakeBrowser.reset()
  extensionApi = fakeBrowser as typeof fakeBrowser
  activeLocale = "zh_CN"
  installExtensionGlobals()
})

afterEach(() => {
  cleanup()
})
