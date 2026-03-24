import { existsSync, readdirSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

describe("icon assets", () => {
  it("keeps only the selected speedline svg plus the generated png in assets", () => {
    const assetsDir = resolve(process.cwd(), "assets")
    const assetNames = readdirSync(assetsDir).sort()

    expect(assetNames.filter((name) => name.endsWith(".svg"))).toEqual(["anime-bt-icon-speedline.svg"])
    expect(assetNames).toContain("icon.png")
    expect(existsSync(resolve(assetsDir, "anime-bt-icon-crest.svg"))).toBe(false)
    expect(existsSync(resolve(assetsDir, "anime-bt-icon-eye.svg"))).toBe(false)
    expect(existsSync(resolve(assetsDir, "brand-icon.svg"))).toBe(false)
  })
})
