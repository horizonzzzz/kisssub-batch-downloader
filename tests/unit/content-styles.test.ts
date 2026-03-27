import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

function readContentStyles() {
  return readFileSync(resolve(process.cwd(), "styles/content.css"), "utf8")
}

describe("content styles", () => {
  it("uses low-specificity control resets so component styles can win", () => {
    const css = readContentStyles()

    expect(css).toContain(".anime-bt-content-root :where(button) {")
    expect(css).toContain('.anime-bt-content-root :where(input:not([type="checkbox"])) {')
  })

  it("keeps the selection checkbox on a native checkbox appearance contract", () => {
    const css = readContentStyles()

    expect(css).toContain(".anime-bt-selection-checkbox__input {")
    expect(css).toContain("-webkit-appearance: checkbox;")
    expect(css).toContain("appearance: auto;")
  })
})
