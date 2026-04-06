import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

type PackageJson = {
  devDependencies?: Record<string, string>
  pnpm?: {
    patchedDependencies?: Record<string, string>
  }
}

function readPackageJson(): PackageJson {
  return JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as PackageJson
}

function readPostcssConfig() {
  return readFileSync(resolve(process.cwd(), "postcss.config.cjs"), "utf8")
}

function readOptionsStyles() {
  return readFileSync(resolve(process.cwd(), "src/entrypoints/options/style.css"), "utf8")
}

describe("tailwind v4 compatibility", () => {
  it("uses the Tailwind v4 PostCSS plugin and dependency versions", () => {
    const packageJson = readPackageJson()
    const postcssConfig = readPostcssConfig()

    expect(packageJson.devDependencies?.tailwindcss).toMatch(/^\^4\./)
    expect(packageJson.devDependencies?.["@tailwindcss/postcss"]).toMatch(/^\^4\./)
    expect(postcssConfig).toContain('"@tailwindcss/postcss"')
    expect(postcssConfig).not.toContain("tailwindcss: {}")
  })

  it("loads options styles through the Tailwind v4 CSS import entry", () => {
    const css = readOptionsStyles()

    expect(css).toContain('@import "tailwindcss";')
    expect(css).toContain('@import "../../styles/tailwind-theme.css";')
    expect(css).not.toContain("@tailwind")
  })

  it("does not keep pnpm patch metadata after the WXT migration", () => {
    const packageJson = readPackageJson()

    expect(packageJson.pnpm?.patchedDependencies).toBeUndefined()
  })

  it("removes the legacy jiti compatibility patch file", () => {
    expect(existsSync(resolve(process.cwd(), "patches/jiti@2.6.1.patch"))).toBe(false)
  })

  it("does not keep pnpm patch metadata for tailwind oxide after the WXT migration", () => {
    const packageJson = readPackageJson()

    expect(packageJson.pnpm?.patchedDependencies).toBeUndefined()
  })

  it("removes the legacy tailwind oxide compatibility patch file", () => {
    expect(existsSync(resolve(process.cwd(), "patches/@tailwindcss__oxide@4.2.2.patch"))).toBe(false)
  })
})
