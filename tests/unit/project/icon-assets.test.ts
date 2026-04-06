import { existsSync, readdirSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

describe("icon assets", () => {
  it("keeps the selected extension brand icon, packaged real favicons where available, and the generated png in assets", () => {
    const assetsDir = resolve(process.cwd(), "src", "assets")
    const assetNames = readdirSync(assetsDir).sort()

    expect(assetNames.filter((name) => name.endsWith(".svg"))).toEqual([
      "anime-bt-icon-speedline.svg",
      "site-icon-bangumimoe.svg"
    ])
    expect(assetNames.filter((name) => name.endsWith(".png"))).toEqual([
      "icon-grayscale.png",
      "icon.png",
      "site-icon-acgrip.png",
      "site-icon-dongmanhuayuan.png",
      "site-icon-kisssub.png"
    ])
    expect(existsSync(resolve(assetsDir, "anime-bt-icon-crest.svg"))).toBe(false)
    expect(existsSync(resolve(assetsDir, "anime-bt-icon-eye.svg"))).toBe(false)
    expect(existsSync(resolve(assetsDir, "brand-icon.svg"))).toBe(false)
    expect(existsSync(resolve(assetsDir, "site-icon-acgrip.svg"))).toBe(false)
    expect(existsSync(resolve(assetsDir, "site-icon-dongmanhuayuan.svg"))).toBe(false)
    expect(existsSync(resolve(assetsDir, "site-icon-kisssub.svg"))).toBe(false)
    expect(existsSync(resolve(assetsDir, "site-icon-acgrip.ico"))).toBe(false)
    expect(existsSync(resolve(assetsDir, "site-icon-dongmanhuayuan.ico"))).toBe(false)
    expect(existsSync(resolve(assetsDir, "site-icon-kisssub.ico"))).toBe(false)
  })
})
