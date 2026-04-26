import { existsSync, readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

type PackageJson = {
  name?: string
  displayName?: string
  license?: string
  scripts?: Record<string, string>
  devDependencies?: Record<string, string>
  manifest?: Record<string, unknown>
}

function readPackageJson(): PackageJson {
  const packageJsonPath = resolve(process.cwd(), "package.json")
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJson
}

function readGlobalTypes() {
  return readFileSync(resolve(process.cwd(), "src/global.d.ts"), "utf8")
}

function readText(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = resolve(directory, entry.name)

    if (entry.isDirectory()) {
      return listSourceFiles(fullPath)
    }

    return fullPath.match(/\.(ts|tsx)$/) ? [fullPath] : []
  })
}

describe("package metadata", () => {
  it("defines the Anime BT Batch brand through WXT metadata instead of package.json manifest fields", () => {
    const packageJson = readPackageJson()
    const wxtConfig = readText("wxt.config.ts")

    expect(packageJson.name).toBe("anime-bt-batch-downloader")
    expect(packageJson.displayName).toBe("Anime BT Batch")
    expect(packageJson.license).toBe("MIT")
    expect(packageJson.manifest).toBeUndefined()
    expect(packageJson.scripts?.dev).toBe("wxt")
    expect(packageJson.scripts?.build).toBe("wxt build")
    expect(packageJson.scripts?.package).toBe("wxt clean && wxt zip")
    expect(packageJson.devDependencies?.plasmo).toBeUndefined()
    expect(packageJson.devDependencies?.wxt).toBeTruthy()
    expect(packageJson.devDependencies?.["@wxt-dev/i18n"]).toBeTruthy()
    expect(wxtConfig).toContain("defineConfig")
    expect(wxtConfig).toContain('@wxt-dev/i18n')
    expect(wxtConfig).toContain("default_locale")
    expect(wxtConfig).toContain("__MSG_extensionName__")
    expect(wxtConfig).toContain("__MSG_extensionDescription__")
    expect(wxtConfig).toContain("__MSG_actionDefaultTitle__")
    expect(wxtConfig).toContain('srcDir: "src"')
    expect(wxtConfig).toContain("popup.html")
    expect(wxtConfig).toContain("options.html")
    expect(wxtConfig).toContain("chrome-mv3-prod")
    expect(wxtConfig).toContain("optimizeDeps")
    expect(wxtConfig).toContain("src/entrypoints/options/index.html")
    expect(wxtConfig).toContain("src/entrypoints/popup/index.html")
    expect(wxtConfig).toContain("!build/**")
    expect(wxtConfig).toContain("!tests/e2e/fixtures/**")
    expect(wxtConfig).toContain("web_accessible_resources")
    expect(wxtConfig).toContain("content-scripts/source-batch.css")
  })

  it("defines source locale catalogs for zh_CN and en in the WXT source tree", () => {
    expect(existsSync(resolve(process.cwd(), "src", "locales", "zh_CN.json"))).toBe(true)
    expect(existsSync(resolve(process.cwd(), "src", "locales", "en.json"))).toBe(true)
  })

  it("keeps downloader host access optional while declaring fixed fetch permissions", () => {
    const wxtConfig = readText("wxt.config.ts")

    expect(wxtConfig).toContain("host_permissions: [")
    expect(wxtConfig).toContain("...CONTENT_SCRIPT_MATCH_PATTERNS")
    expect(wxtConfig).toContain("...TORRENT_FILE_FETCH_MATCH_PATTERNS")
    expect(wxtConfig).toContain('optional_host_permissions: ["http://*/*", "https://*/*"]')
  })

  it("declares fixed host permissions for shared torrent-file download providers", () => {
    const wxtConfig = readText("wxt.config.ts")
    const matchingDefinitions = readText("src/lib/sources/matching.ts")

    expect(wxtConfig).toContain("TORRENT_FILE_FETCH_MATCH_PATTERNS")
    expect(matchingDefinitions).toContain("*://*.uploadbt.com/*")
  })

  it("does not keep Kisssub remote helper script defaults in production source", () => {
    const sourceRoots = [
      resolve(process.cwd(), "src", "components"),
      resolve(process.cwd(), "src", "entrypoints"),
      resolve(process.cwd(), "src", "lib")
    ]
    const productionSource = sourceRoots
      .filter((root) => existsSync(root))
      .flatMap((root) => listSourceFiles(root))
      .map((filePath) => readFileSync(filePath, "utf8"))
      .join("\n")

    expect(productionSource).not.toContain("1.acgscript.com")
    expect(productionSource).not.toContain("user_script_url")
    expect(productionSource).not.toContain("user_script_rev")
  })

  it("declares the background runtime permissions required by subscription polling and notifications", () => {
    const wxtConfig = readText("wxt.config.ts")

    expect(wxtConfig).toContain('permissions: ["storage", "tabs", "scripting", "alarms", "notifications"]')
  })

  it("uses the WXT root command for development instead of the invalid 'wxt dev' form", () => {
    const packageJson = readPackageJson()

    expect(packageJson.scripts?.dev).toBe("wxt")
    expect(packageJson.scripts?.dev).not.toContain("wxt dev")
  })

  it("uses WXT entrypoints instead of root-level extension entry files", () => {
    expect(existsSync(resolve(process.cwd(), "wxt.config.ts"))).toBe(true)
    expect(existsSync(resolve(process.cwd(), "src", "entrypoints", "background", "index.ts"))).toBe(
      true
    )
    expect(existsSync(resolve(process.cwd(), "src", "entrypoints", "popup", "index.html"))).toBe(
      true
    )
    expect(existsSync(resolve(process.cwd(), "src", "entrypoints", "popup", "style.css"))).toBe(
      true
    )
    expect(existsSync(resolve(process.cwd(), "src", "entrypoints", "options", "index.html"))).toBe(
      true
    )
    expect(existsSync(resolve(process.cwd(), "src", "entrypoints", "options", "style.css"))).toBe(
      true
    )
    expect(
      existsSync(resolve(process.cwd(), "src", "entrypoints", "source-batch.content", "index.tsx"))
    ).toBe(true)
    expect(
      existsSync(resolve(process.cwd(), "src", "entrypoints", "source-batch.content", "style.css"))
    ).toBe(true)

    expect(existsSync(resolve(process.cwd(), "background.ts"))).toBe(false)
    expect(existsSync(resolve(process.cwd(), "popup.tsx"))).toBe(false)
    expect(existsSync(resolve(process.cwd(), "options.tsx"))).toBe(false)
    expect(existsSync(resolve(process.cwd(), "contents", "source-batch.tsx"))).toBe(false)
    expect(existsSync(resolve(process.cwd(), "lib", "background", "runtime.ts"))).toBe(false)
    expect(existsSync(resolve(process.cwd(), "components", "options-page.tsx"))).toBe(false)
    expect(existsSync(resolve(process.cwd(), "entrypoints"))).toBe(false)
    expect(existsSync(resolve(process.cwd(), "components"))).toBe(false)
    expect(existsSync(resolve(process.cwd(), "lib"))).toBe(false)
  })

  it("keeps lucide-react imports scoped to shadcn ui primitives", () => {
    const sourceRoots = [
      resolve(process.cwd(), "src", "components"),
      resolve(process.cwd(), "src", "entrypoints"),
      resolve(process.cwd(), "src", "lib")
    ]
    const allowedUiDir = resolve(process.cwd(), "src", "components", "ui")
    const filesToCheck = sourceRoots
      .filter((root) => existsSync(root))
      .flatMap((root) => listSourceFiles(root))
      .filter((filePath) => !filePath.startsWith(`${allowedUiDir}\\`))
    const filesUsingLucide = filesToCheck.filter((filePath) =>
      readFileSync(filePath, "utf8").includes("lucide-react")
    )

    expect(filesUsingLucide).toEqual([])
  })

  it("uses WXT's browser API wrapper in production source files instead of direct chrome globals", () => {
    const sourceRoots = [
      resolve(process.cwd(), "src", "components"),
      resolve(process.cwd(), "src", "entrypoints"),
      resolve(process.cwd(), "src", "lib")
    ]
    const filesToCheck = sourceRoots
      .filter((root) => existsSync(root))
      .flatMap((root) => listSourceFiles(root))
    const filesUsingChromeGlobals = filesToCheck.filter((filePath) =>
      /\bchrome\./.test(readFileSync(filePath, "utf8"))
    )

    expect(filesUsingChromeGlobals).toEqual([])
  })

  it("does not keep legacy sass dependencies or scss module declarations", () => {
    const packageJson = readPackageJson()
    const globalTypes = readGlobalTypes()

    expect(packageJson.devDependencies?.sass).toBeUndefined()
    expect(globalTypes).not.toContain('declare module "*.module.scss"')
    expect(globalTypes).not.toContain('declare module "*.scss"')
  })
})
