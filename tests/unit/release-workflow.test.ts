import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8")
}

describe("release workflow", () => {
  it("publishes a GitHub Release from semantic version tags", () => {
    const workflow = readRepoFile(".github/workflows/release.yml")

    expect(workflow).toContain("tags:")
    expect(workflow).toContain("- 'v*.*.*'")
    expect(workflow).toContain("pnpm install --frozen-lockfile")
    expect(workflow).toContain("pnpm build")
    expect(workflow).toContain("pnpm package")
    expect(workflow).toContain("gh release create")
    expect(workflow).toContain("--generate-notes")
  })

  it("keeps release instructions out of the README", () => {
    const readme = readRepoFile("README.md")

    expect(readme).not.toContain("## Release")
    expect(readme).not.toContain("GitHub Release")
  })
})
