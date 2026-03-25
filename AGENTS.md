# AGENT.md

## Purpose

`Anime BT Batch Downloader` is a browser extension that batches downloads from supported anime BT source pages into `qBittorrent WebUI`.

The extension injects selection UI into supported list pages, reuses direct magnet or torrent links when available, falls back to detail-page extraction when necessary, deduplicates results, and submits the final batch to qBittorrent.

## Current Scope

- Supported source adapters: `kisssub.org`, `dongmanhuayuan.com`, `acg.rip`, `bangumi.moe`
- Supported source management in the options page:
  - `连接与基础设置`
  - `站点配置`
  - `源站概览`
- Supported downloader target: `qBittorrent WebUI` only
- Optional per-batch save path override is supported
- Magnet links are preferred; torrent URLs are the fallback
- Each supported source can be enabled or disabled by the user:
  - disabled sources keep their saved per-site configuration
  - disabled sources do not inject the batch UI on matching pages
  - disabled sources are rejected again by the background batch pipeline
- Releases are published from semantic version tags, with GitHub Release notes sourced from `CHANGELOG.md`
- Release assets are uploaded as versioned Chrome MV3 zip archives named `anime-bt-batch-downloader-chrome-mv3-v<version>.zip`
- Known product gaps:
  - no task cancellation flow
  - no advanced qBittorrent options such as tags or categories

## Stack And Runtime Model

- `Plasmo`
- `React 19`
- `TypeScript`
- `Ant Design` for the options UI
- `SCSS Modules` for extension-owned styling, with a small shared SCSS token/mixin layer
- Browser-extension runtime with:
  - a background service worker in `background.ts`
  - a content script entry in `contents/kisssub.tsx`
  - an options page entry in `options.tsx`

## Source Of Truth Files

- `background.ts`
  Handles runtime message registration, settings access, qBittorrent connection tests, and delegates batch orchestration to shared helpers in `lib/background-batch.ts`.
- `options.tsx`
  Boots the options page and wires the React UI to background message APIs.
- `components/`
  UI components for the floating batch panel, selection checkbox, unified site-management view, and options page shell, plus their colocated `*.module.scss` files.
- `contents/`
  Content script entry for supported source pages and DOM injection orchestration.
- `styles/`
  Shared SCSS tokens, mixins, and options-page global styles that are consumed by component-level SCSS modules.
- `assets/`
  Source icon assets for the extension brand. `anime-bt-icon-speedline.svg` is the UI source icon, and `icon.png` is the generated packaging icon consumed by Plasmo for extension icon sizes.
- `CHANGELOG.md`
  Canonical release notes for tagged versions. Each GitHub Release page should reuse the matching version section from this file. New release entries must summarize the changes from the previous version tag up to the new release commit.
- `lib/`
  Shared batch helpers, background batch orchestration helpers, extraction helpers, qBittorrent API helpers, settings logic, per-source configuration metadata, constants, and shared types.
- `.github/workflows/release.yml`
  Tagged-release automation that validates versions, packages the extension, extracts the matching `CHANGELOG.md` section, renames the packaged archive, and publishes the GitHub Release.
- `scripts/prepare-release.mjs`
  Release helper script that extracts version notes from `CHANGELOG.md`, renames the packaged zip artifact, and exposes the prepared paths to the workflow.
- `lib/sources/`
  Source adapter registry plus site-specific page matching and extraction logic.
- `tests/`
  Unit, component, and Playwright end-to-end coverage.

## Generated Or Derived Directories

These paths are generated or derived artifacts and should not be treated as the primary place to implement source changes:

- `.plasmo/`
- `build/`
- `coverage/`
- `test-results/`

## Development Commands

Commands are defined in `package.json`:

- `pnpm dev`
- `pnpm build`
- `pnpm package`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:watch`
- `pnpm test:e2e`
- `pnpm test:all`

## Test Surface

- `pnpm typecheck`
  TypeScript compile-time validation.
- `pnpm test`
  Vitest unit and component tests under `tests/unit/` and `tests/components/` using `jsdom`.
- `pnpm test:e2e`
  Playwright extension-level tests under `tests/e2e/`, including options-page coverage and list-page injection flows for all 4 supported BT sources.
- `pnpm test:all`
  Full verification: typecheck + Vitest + Playwright.

## Agent Notes

- Read this file before making changes that touch extension behavior, architecture, or test workflows.
- Prefer editing the real source files listed above, not generated outputs.
- If a change adds a new source adapter, changes downloader behavior, alters commands, changes test coverage, moves responsibilities between directories, or changes major runtime flow, update this file in the same change.
- If a change alters release notes sourcing, tagged asset naming, or GitHub release automation, update `CHANGELOG.md`, `.github/workflows/release.yml`, and this file together.
- When preparing a version release, `CHANGELOG.md` must be updated before tagging. Treat this as a required release step, not an optional documentation cleanup.
- Each new `CHANGELOG.md` version section must cover the diff from the previous version tag to the new release commit, rather than only summarizing the final release commit itself.
- Each new version section must use this structure under `## <version>`:
  - `### Features`
  - `### Fixes`
  - `### Refactor`
- Under each subsection, add concise bullets that summarize the relevant changes and append the associated commit reference for traceability.
- Omit any empty subsection rather than inserting placeholder text, but keep the subsection heading format exactly as `### Features`, `### Fixes`, and `### Refactor` whenever that category has entries.
- When creating commits, use standard Conventional Commits style messages such as `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`, or `chore: ...`.
- If a change updates the extension branding or icon pipeline, keep `assets/anime-bt-icon-speedline.svg` and the generated `assets/icon.png` aligned in the same change.
- If a code change makes any statement in this file stale, update `AGENTS.md` before finishing the task.
