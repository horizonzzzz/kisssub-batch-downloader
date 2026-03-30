import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

type PackageJson = {
  name?: string
  displayName?: string
  license?: string
  devDependencies?: Record<string, string>
  manifest?: {
    name?: string
    description?: string
    action?: {
      default_title?: string
    }
  }
}

function readPackageJson(): PackageJson {
  const packageJsonPath = resolve(process.cwd(), "package.json")
  return JSON.parse(readFileSync(packageJsonPath, "utf8")) as PackageJson
}

function readGlobalTypes() {
  return readFileSync(resolve(process.cwd(), "global.d.ts"), "utf8")
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
  it("defines the Anime BT Batch brand for generated extension pages and extension metadata", () => {
    const packageJson = readPackageJson()

    expect(packageJson.name).toBe("anime-bt-batch-downloader")
    expect(packageJson.displayName).toBe("Anime BT Batch")
    expect(packageJson.license).toBe("MIT")
    expect(packageJson.manifest?.name).toBe("Anime BT Batch")
    expect(packageJson.manifest?.action?.default_title).toBe("Anime BT Batch")
    expect(packageJson.manifest?.description).toContain("anime BT source")
  })

  it("keeps lucide-react imports scoped to shadcn ui primitives", () => {
    const sourceRoots = [
      resolve(process.cwd(), "components"),
      resolve(process.cwd(), "contents"),
      resolve(process.cwd(), "lib")
    ]
    const rootEntries = [
      resolve(process.cwd(), "background.ts"),
      resolve(process.cwd(), "options.tsx")
    ]
    const allowedUiDir = resolve(process.cwd(), "components", "ui")
    const filesToCheck = sourceRoots
      .flatMap((root) => listSourceFiles(root))
      .concat(rootEntries)
      .filter((filePath) => !filePath.startsWith(`${allowedUiDir}\\`))
    const filesUsingLucide = filesToCheck.filter((filePath) =>
      readFileSync(filePath, "utf8").includes("lucide-react")
    )

    expect(filesUsingLucide).toEqual([])
  })

  it("does not keep legacy sass dependencies or scss module declarations", () => {
    const packageJson = readPackageJson()
    const globalTypes = readGlobalTypes()

    expect(packageJson.devDependencies?.sass).toBeUndefined()
    expect(globalTypes).not.toContain('declare module "*.module.scss"')
    expect(globalTypes).not.toContain('declare module "*.scss"')
  })
})
