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
  return readFileSync(resolve(process.cwd(), "styles/options.css"), "utf8")
}

function readPatchFile() {
  return readFileSync(resolve(process.cwd(), "patches/jiti@2.6.1.patch"), "utf8")
}

function readOxidePatchFile() {
  return readFileSync(resolve(process.cwd(), "patches/@tailwindcss__oxide@4.2.2.patch"), "utf8")
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
    expect(css).toContain('@import "./tailwind-theme.css";')
    expect(css).not.toContain("@tailwind")
  })

  it("persists the pnpm patch for jiti in package metadata", () => {
    const packageJson = readPackageJson()

    expect(packageJson.pnpm?.patchedDependencies?.["jiti@2.6.1"]).toBe("patches/jiti@2.6.1.patch")
  })

  it("stores a jiti patch that removes the node:module require", () => {
    expect(existsSync(resolve(process.cwd(), "patches/jiti@2.6.1.patch"))).toBe(true)

    const patch = readPatchFile()

    expect(patch).toContain('-const { createRequire } = require("node:module");')
    expect(patch).toContain('+const { createRequire } = require("module");')
  })

  it("persists the pnpm patch for @tailwindcss/oxide in package metadata", () => {
    const packageJson = readPackageJson()

    expect(packageJson.pnpm?.patchedDependencies?.["@tailwindcss/oxide@4.2.2"]).toBe(
      "patches/@tailwindcss__oxide@4.2.2.patch"
    )
  })

  it("stores an oxide patch that removes the node:fs require", () => {
    expect(existsSync(resolve(process.cwd(), "patches/@tailwindcss__oxide@4.2.2.patch"))).toBe(true)

    const patch = readOxidePatchFile()

    expect(patch).toContain("-const { readFileSync } = require('node:fs')")
    expect(patch).toContain("+const { readFileSync } = require('fs')")
  })
})
