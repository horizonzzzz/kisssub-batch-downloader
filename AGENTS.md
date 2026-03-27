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
  - the options workspace uses hash-routed navigation with:
    - `options.html#/general`
    - `options.html#/sites`
    - `options.html#/overview`
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
- `Tailwind CSS` for the options UI layout and visual styling
- lightweight `shadcn/ui`-style primitives built in-repo with `Radix UI`
- icon-library policy:
  - project-owned UI outside `components/ui/` should use `react-icons`
  - `components/ui/` primitives that come from the project's `shadcn/ui` pattern may keep `lucide-react` icons when introduced by shadcn
- `React Hook Form` + `zod` for the options settings form model and validation
- content-script UI mounts inside `Shadow Root` hosts so the injected batch panel and selection checkbox stay isolated from host-page styles while still using React roots
- injected contents UI styling is provided by dedicated CSS text from `styles/content.css`, injected into each shadow root at runtime
- Browser-extension runtime with:
  - a background service worker in `background.ts`
  - a content script entry in `contents/source-batch.tsx`
  - an options page entry in `options.tsx`

## Source Of Truth Files

- `background.ts`
  Handles runtime message registration, settings access, qBittorrent connection tests, and delegates batch orchestration to shared helpers in `lib/background-batch.ts`.
- `options.tsx`
  Boots the hash-routed options page, loads `styles/options.css`, and wires the React options UI to background message APIs.
- `components/`
  UI components for the floating batch panel and selection checkbox, plus the options workspace under `components/options/` and shared option-page primitives under `components/ui/`.
- `components/options/`
  Source of truth for the options workspace shell, hash-route config, form hooks/schema, and the `general` / `sites` / `overview` page implementations.
- `components/ui/`
  Tailwind-first primitive components used by the options workspace, including buttons, inputs, cards, badges, alerts, switches, and radio groups.
- `contents/`
  Content script entry for supported source pages, Shadow Root host orchestration, and injected React UI mounting.
- `styles/`
  `styles/options.css` is the Tailwind entry for the options page, while `styles/content.css` is the dedicated shadow-root CSS source for injected content UI.
- `assets/`
  Static icon assets used by the extension UI. `anime-bt-icon-speedline.svg` is the extension brand icon, packaged site icons for the options-page site-management cards are normalized to local `site-icon-*.(png|svg)` assets, and `icon.png` is the generated packaging icon consumed by Plasmo for extension icon sizes.
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
- If options-page work needs an additional `shadcn/ui` component, add the component directly in the project’s existing `shadcn/ui` pattern instead of hand-rolling a bespoke replacement.
- Do not migrate `lucide-react` icons that are introduced by `shadcn/ui` inside `components/ui/` only for icon-library consistency. Outside `components/ui/`, prefer `react-icons` for project-owned UI.
- If a change updates the extension branding or icon pipeline, keep `assets/anime-bt-icon-speedline.svg` and the generated `assets/icon.png` aligned in the same change.
- If a code change makes any statement in this file stale, update `AGENTS.md` before finishing the task.
