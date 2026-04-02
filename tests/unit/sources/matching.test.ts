import { describe, expect, it } from "vitest"

import { CONTENT_SCRIPT_MATCH_PATTERNS, matchesSourceHost } from "../../../lib/sources/matching"

describe("source matching definitions", () => {
  it("matches bare and www host variants from the shared source host map", () => {
    expect(matchesSourceHost("kisssub", new URL("https://kisssub.org/list-test.html"))).toBe(true)
    expect(matchesSourceHost("kisssub", new URL("https://www.kisssub.org/list-test.html"))).toBe(true)
    expect(matchesSourceHost("dongmanhuayuan", new URL("https://dongmanhuayuan.com/"))).toBe(true)
    expect(matchesSourceHost("dongmanhuayuan", new URL("https://www.dongmanhuayuan.com/"))).toBe(true)
    expect(matchesSourceHost("acgrip", new URL("https://acg.rip/"))).toBe(true)
    expect(matchesSourceHost("acgrip", new URL("https://www.acg.rip/"))).toBe(true)
    expect(matchesSourceHost("bangumimoe", new URL("https://bangumi.moe/search/index"))).toBe(true)
    expect(matchesSourceHost("bangumimoe", new URL("https://www.bangumi.moe/search/index"))).toBe(true)
  })

  it("rejects unrelated sibling domains and keeps wildcard content-script matches unique", () => {
    expect(matchesSourceHost("acgrip", new URL("https://notacg.rip/"))).toBe(false)
    expect(matchesSourceHost("kisssub", new URL("https://kisssub.org.example.com/"))).toBe(false)
    expect(matchesSourceHost("bangumimoe", new URL("https://bangumi.moe.example.com/"))).toBe(false)

    expect(CONTENT_SCRIPT_MATCH_PATTERNS).toEqual([
      "*://*.kisssub.org/*",
      "*://*.dongmanhuayuan.com/*",
      "*://*.acg.rip/*",
      "*://*.bangumi.moe/*"
    ])
    expect(new Set(CONTENT_SCRIPT_MATCH_PATTERNS).size).toBe(CONTENT_SCRIPT_MATCH_PATTERNS.length)
  })
})
