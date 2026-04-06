import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

function readContentStyles() {
  return readFileSync(resolve(process.cwd(), "src/entrypoints/source-batch.content/style.css"), "utf8")
}

describe("content styles", () => {
  it("uses the Tailwind v4 split import path without pulling preflight into contents", () => {
    const css = readContentStyles()

    expect(css).toContain('@import "../../styles/tailwind-theme.css";')
    expect(css).toContain('@import "tailwindcss/theme.css"')
    expect(css).toContain('@import "tailwindcss/utilities.css"')
    expect(css).not.toContain('@import "tailwindcss/preflight.css"')
    expect(css).not.toContain('@import "tailwindcss";')
    expect(css).not.toContain("@tailwind")
  })

  it("uses low-specificity control resets so component styles can win", () => {
    const css = readContentStyles()

    expect(css).toContain(".anime-bt-content-root :where(button) {")
    expect(css).toContain('.anime-bt-content-root :where(input:not([type="checkbox"])) {')
  })

  it("defines contents-specific px tokens for panel and control sizing", () => {
    const css = readContentStyles()

    expect(css).toContain("--anime-bt-panel-width: 336px;")
    expect(css).toContain("--anime-bt-control-height: 42px;")
    expect(css).toContain("--anime-bt-checkbox-pill-height: 24px;")
  })

  it("keeps only a minimal Tailwind variable prelude inside the contents root", () => {
    const css = readContentStyles()

    expect(css).toContain(".anime-bt-content-root {")
    expect(css).not.toContain("@layer base")
  })

  it("initializes the Tailwind runtime variables that contents utilities depend on", () => {
    const css = readContentStyles()

    expect(css).toContain("--tw-border-style: solid;")
    expect(css).toContain("--tw-translate-x: 0;")
    expect(css).toContain("--tw-translate-y: 0;")
    expect(css).toContain("--tw-shadow: 0 0 #0000;")
    expect(css).toContain("--tw-ring-shadow: 0 0 #0000;")
    expect(css).toContain("--tw-ring-offset-shadow: 0 0 #0000;")
  })

  it("keeps content.css limited to the root-scoped entry layer", () => {
    const css = readContentStyles()

    expect(css).toContain(".anime-bt-content-root {")
    expect(css).toContain("@media (max-width: 680px) {")
    expect(css).not.toContain(".anime-bt-batch-panel")
    expect(css).not.toContain(".anime-bt-batch-panel__")
    expect(css).not.toContain(".anime-bt-selection-checkbox")
    expect(css).not.toContain(".anime-bt-selection-checkbox__")
  })
})
