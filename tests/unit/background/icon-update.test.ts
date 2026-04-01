import { describe, expect, it } from "vitest"

// Import the actual function from background.ts
import { resolveIsSupportedSite } from "../../../background"

describe("resolveIsSupportedSite", () => {
  it("returns true for supported kisssub URL", () => {
    const result = resolveIsSupportedSite("https://www.kisssub.org/")
    expect(result).toBe(true)
  })

  it("returns true for supported dongmanhuayuan URL", () => {
    const result = resolveIsSupportedSite("https://www.dongmanhuayuan.com/")
    expect(result).toBe(true)
  })

  it("returns true for supported acgrip URL", () => {
    const result = resolveIsSupportedSite("https://acg.rip/")
    expect(result).toBe(true)
  })

  it("returns false for unsupported URL", () => {
    const result = resolveIsSupportedSite("https://www.google.com/")
    expect(result).toBe(false)
  })

  it("returns false for null URL", () => {
    const result = resolveIsSupportedSite(null)
    expect(result).toBe(false)
  })

  it("returns false for undefined URL", () => {
    const result = resolveIsSupportedSite(undefined)
    expect(result).toBe(false)
  })

  it("returns false for empty string URL", () => {
    const result = resolveIsSupportedSite("")
    expect(result).toBe(false)
  })

  it("returns false for chrome:// URL", () => {
    const result = resolveIsSupportedSite("chrome://extensions")
    expect(result).toBe(false)
  })

  it("returns false for chrome-extension:// URL", () => {
    const result = resolveIsSupportedSite("chrome-extension://abc123/popup.html")
    expect(result).toBe(false)
  })

  it("returns false for invalid URL string", () => {
    const result = resolveIsSupportedSite("not-a-valid-url")
    expect(result).toBe(false)
  })
})