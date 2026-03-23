import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

type PackageJson = {
  name?: string
  displayName?: string
  license?: string
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
})
