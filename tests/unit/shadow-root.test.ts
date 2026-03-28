import { beforeEach, describe, expect, it, vi } from "vitest"

describe("shadow-root helpers", () => {
  beforeEach(() => {
    vi.resetModules()
    document.head.innerHTML = ""
    document.body.innerHTML = ""
  })

  it("does not permanently cache a stylesheet miss before the stylesheet exists", async () => {
    const { getDocumentStylesheetText } = await import("../../lib/content/shadow-root")

    expect(getDocumentStylesheetText("content-ui", "anime-bt-content-root")).toBe("")

    const style = document.createElement("style")
    style.textContent = ".anime-bt-content-root { color: rgb(37, 99, 235); }"
    document.head.appendChild(style)

    expect(getDocumentStylesheetText("content-ui", "anime-bt-content-root")).toContain(
      ".anime-bt-content-root"
    )
  })
})
