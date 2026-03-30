import { spawnSync } from "node:child_process"
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

function readRepoFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8")
}

const temporaryDirectories: string[] = []

function createTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "anime-bt-release-"))
  temporaryDirectories.push(directory)
  return directory
}

function parseGitHubOutput(rawOutput: string): Record<string, string> {
  return rawOutput
    .split(/\r?\n/u)
    .filter(Boolean)
    .reduce<Record<string, string>>((outputs, line) => {
      const separatorIndex = line.indexOf("=")

      if (separatorIndex === -1) {
        return outputs
      }

      const key = line.slice(0, separatorIndex)
      const value = line.slice(separatorIndex + 1)
      outputs[key] = value
      return outputs
    }, {})
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop()

    if (directory) {
      rmSync(directory, { recursive: true, force: true })
    }
  }
})

describe("release workflow", () => {
  it("publishes a GitHub Release from semantic version tags", () => {
    const workflow = readRepoFile(".github/workflows/release.yml")

    expect(workflow).toContain("tags:")
    expect(workflow).toContain("- 'v*.*.*'")
    expect(workflow).toContain("pnpm/action-setup@v4")
    expect(workflow).toContain("pnpm install --frozen-lockfile")
    expect(workflow).toContain("pnpm build")
    expect(workflow).toContain("pnpm package")
    expect(workflow).toContain("gh release create")
    expect(workflow).toContain("scripts/prepare-release.mjs")
    expect(workflow).toContain("CHANGELOG.md")
    expect(workflow).toContain("--notes-file")
    expect(workflow).toContain("--draft=false")
    expect(workflow).toContain("gh release edit")
    expect(workflow).not.toContain("--generate-notes")
  })

  it("prepares release notes for the tagged version and renames the packaged archive", () => {
    const temporaryDirectory = createTemporaryDirectory()
    const archivePath = join(temporaryDirectory, "chrome-mv3-prod.zip")
    const changelogPath = join(temporaryDirectory, "CHANGELOG.md")
    const notesPath = join(temporaryDirectory, "release-notes.md")
    const githubOutputPath = join(temporaryDirectory, "github-output.txt")

    writeFileSync(archivePath, "dummy archive", "utf8")
    writeFileSync(
      changelogPath,
      `# Changelog

## 1.1.0

- Refreshed the options workspace and batch panel.
- Added versioned release archive names.

## 1.0.0

- Initial release.
`,
      "utf8"
    )

    const result = spawnSync(
      process.execPath,
      [
        resolve(process.cwd(), "scripts/prepare-release.mjs"),
        "--tag",
        "v1.1.0",
        "--archive",
        archivePath,
        "--changelog",
        changelogPath,
        "--notes-out",
        notesPath,
        "--github-output",
        githubOutputPath
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    )

    const renamedArchivePath = join(
      temporaryDirectory,
      "anime-bt-batch-downloader-chrome-mv3-v1.1.0.zip"
    )
    const outputs = parseGitHubOutput(readFileSync(githubOutputPath, "utf8"))
    const releaseNotes = readFileSync(notesPath, "utf8")

    expect(result.status).toBe(0)
    expect(existsSync(archivePath)).toBe(false)
    expect(existsSync(renamedArchivePath)).toBe(true)
    expect(outputs.asset_path).toBe(renamedArchivePath)
    expect(outputs.notes_path).toBe(notesPath)
    expect(releaseNotes).toContain("Refreshed the options workspace")
    expect(releaseNotes).toContain("Added versioned release archive names.")
    expect(releaseNotes).not.toContain("Initial release.")
  })

  it("fails when the tagged version does not exist in CHANGELOG.md", () => {
    const temporaryDirectory = createTemporaryDirectory()
    const archivePath = join(temporaryDirectory, "chrome-mv3-prod.zip")
    const changelogPath = join(temporaryDirectory, "CHANGELOG.md")
    const notesPath = join(temporaryDirectory, "release-notes.md")

    writeFileSync(archivePath, "dummy archive", "utf8")
    writeFileSync(
      changelogPath,
      `# Changelog

## 1.0.0

- Initial release.
`,
      "utf8"
    )

    const result = spawnSync(
      process.execPath,
      [
        resolve(process.cwd(), "scripts/prepare-release.mjs"),
        "--tag",
        "v1.1.0",
        "--archive",
        archivePath,
        "--changelog",
        changelogPath,
        "--notes-out",
        notesPath
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8"
      }
    )

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Missing changelog section for version 1.1.0")
    expect(existsSync(notesPath)).toBe(false)
  })

  it("keeps repository-owned changelog entries for current and historical releases", () => {
    const changelog = readRepoFile("CHANGELOG.md")

    expect(changelog).toContain("## 1.1.0")
    expect(changelog).toContain("## 1.0.0")
  })

  it("keeps release instructions out of the README", () => {
    const readme = readRepoFile("README.md")

    expect(readme).not.toContain("## Release")
    expect(readme).not.toContain("GitHub Release")
  })
})
