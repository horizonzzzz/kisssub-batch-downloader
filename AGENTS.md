# AGENT.md

## Purpose

`Anime BT Batch Downloader` is a browser extension that batches downloads from supported anime BT source pages into `qBittorrent WebUI`.

The extension injects selection UI into supported list pages, reuses direct magnet or torrent links when available, falls back to detail-page extraction when necessary, deduplicates results, and submits the final batch to qBittorrent.

## Current Scope

- Supported source adapters: `kisssub.org`, `dongmanhuayuan.com`, `acg.rip`
- Supported downloader target: `qBittorrent WebUI` only
- Optional per-batch save path override is supported
- Magnet links are preferred; torrent URLs are the fallback
- Known product gaps:
  - no task cancellation flow
  - no advanced qBittorrent options such as tags or categories

## Stack And Runtime Model

- `Plasmo`
- `React 19`
- `TypeScript`
- `Ant Design` for the options UI
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
  UI components for the floating batch panel, selection checkbox, and options page.
- `contents/`
  Content script entry and injected styles for supported source pages.
- `assets/`
  Source icon assets for the extension brand. `anime-bt-icon-speedline.svg` is the UI source icon, and `icon.png` is the generated packaging icon consumed by Plasmo for extension icon sizes.
- `lib/`
  Shared batch helpers, background batch orchestration helpers, extraction helpers, qBittorrent API helpers, settings logic, constants, and shared types.
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
  Playwright extension-level tests under `tests/e2e/`, including options-page coverage and list-page injection flows for all 3 supported BT sources.
- `pnpm test:all`
  Full verification: typecheck + Vitest + Playwright.

## Agent Notes

- Read this file before making changes that touch extension behavior, architecture, or test workflows.
- Prefer editing the real source files listed above, not generated outputs.
- If a change adds a new source adapter, changes downloader behavior, alters commands, changes test coverage, moves responsibilities between directories, or changes major runtime flow, update this file in the same change.
- If a change updates the extension branding or icon pipeline, keep `assets/anime-bt-icon-speedline.svg` and the generated `assets/icon.png` aligned in the same change.
- If a code change makes any statement in this file stale, update `AGENT.md` before finishing the task.
