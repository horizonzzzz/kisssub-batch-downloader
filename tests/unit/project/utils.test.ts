import { describe, expect, it } from "vitest"

import { cn } from "../../../lib/shared/cn"

describe("cn", () => {
  it("merges Tailwind class conflicts and ignores falsy values", () => {
    expect(cn("px-3 py-2", false, undefined, "px-4", "text-sm")).toBe(
      "py-2 px-4 text-sm"
    )
  })
})
