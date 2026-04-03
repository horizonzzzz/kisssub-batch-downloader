# AGENT.md

## Purpose

`Anime BT Batch Downloader` is a browser extension that batches downloads from supported anime BT source pages into `qBittorrent WebUI`.

The extension injects selection UI into supported list pages, reuses direct magnet or torrent links when available, falls back to detail-page extraction when necessary, deduplicates results, and submits the final batch to qBittorrent.

## Current Scope

- Supported source adapters: `kisssub.org`, `dongmanhuayuan.com`, `acg.rip`, `bangumi.moe`
- Supported source management in the options page:
  - `Connection & Basic Settings`
  - `Site Configuration`
  - `Filter Rules`
    - rendered as a simplified filter workspace backed by persisted `filters`
    - each filter uses two levels of conditions: `must[]` for conditions that all need to match, and optional `any[]` for conditions where at least one must match
    - page interactions write through the shared settings form, and the quick test bench exercises the same include-only filter engine used by the runtime
  - `Batch History`
  - `Source Overview`
- Supported popup surface responsibilities:
  - loading extension runtime status for quick checks before opening options
  - probing qBittorrent connectivity on the active supported/enabled source page, surfacing active-tab source support/enabled state, and linking to configuration when the connection check fails
  - offering quick links into options routes and one-click enable/disable for the active supported source, with immediate sync to the current tab's injected UI
- the options workspace uses hash-routed navigation with:
  - `options.html#/general`
  - `options.html#/sites`
  - `options.html#/filters`
  - `options.html#/history`
  - `options.html#/overview`
- Supported downloader target: `qBittorrent WebUI` only
- Optional per-batch save path override is supported
- Pre-submit filters can keep resources by source field, title field, and extracted subgroup field
- When any enabled filter exists, unmatched resources are blocked; when no enabled filters exist, resources are allowed by default
- Magnet links are preferred; torrent URLs are the fallback
- Each supported source can be enabled or disabled by the user:
  - disabled sources keep their saved per-site configuration
  - disabled sources do not inject the batch UI on matching pages
  - disabled sources are rejected again by the background batch pipeline
  - popup-driven source toggles should take effect on the current matching tab without requiring a manual page refresh
- Releases are published from semantic version tags, with GitHub Release notes sourced from `CHANGELOG.md`
- Release assets are uploaded as versioned Chrome MV3 zip archives named `anime-bt-batch-downloader-chrome-mv3-v<version>.zip`
- Known product gaps:
  - no task cancellation flow
  - no advanced qBittorrent options such as tags or categories

## Stack And Runtime Model

- `Plasmo`
- `React 19`
- `TypeScript`
- `Tailwind CSS` for the options UI layout and visual styling, plus scoped contents UI styling compiled into injected shadow-root CSS text
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
  - a popup entry in `popup.tsx`
  - an options page entry in `options.tsx`

## Source Of Truth Files

- `background.ts`
  Handles runtime message registration and delegates batch orchestration plus qBittorrent connection tests to `lib/background/`.
- `options.tsx`
  Boots the hash-routed options page, loads `styles/options.css`, and wires the React options UI to background message APIs.
- `popup.tsx`
  Boots the popup page, loads `styles/popup.css`, and mounts the popup container that drives popup actions via runtime message APIs.
- `components/`
  UI components for the floating batch panel, popup surface, and selection checkbox. The root `components/batch-panel.tsx` now acts as the injected panel entry shell and delegates focused panel sections to `components/batch-panel/`; popup UI lives under `components/popup/`; the options workspace lives under `components/options/`, contents-specific primitives under `components/content-ui/`, and shared option-page primitives under `components/ui/`.
- `components/batch-panel/`
  Focused injected batch-panel sections and pure view-state helpers for launcher/header/summary/advanced/actions composition. Keep batch-panel-specific UI derivation here instead of growing `components/batch-panel.tsx` again.
- `components/popup/`
  Source of truth for popup container/state rendering and popup-only sections such as status, quick actions, supported-site list, and footer actions.
- `components/content-ui/`
  Contents-only Tailwind/shadcn-style primitives for the injected batch panel and selection checkbox visuals. Keep these isolated from `components/ui/` so third-party page injection stays on its own sizing, reset contract, and `data-*` test-anchor surface.
- `components/options/`
  Source of truth for the options workspace shell, hash-route config, form hooks/schema, shared options-only form fragments under `components/options/form/`, and the `general` / `sites` / `overview` page implementations.
  Filtering rules UI lives under `components/options/pages/filters/` and persists simplified `filters` data through the shared settings form; drawers, cards, and the quick test bench all reflect the real include-only filter model and feed the backend filter engine.
- `components/ui/`
  Tailwind-first primitive components used by the options workspace, including buttons, inputs, cards, badges, alerts, switches, and radio groups.
- `contents/`
  Content script entry for supported source pages, Shadow Root host orchestration, and injected React UI mounting.
- `styles/`
  `styles/options.css` is the Tailwind entry for the options page, `styles/popup.css` is the popup entry stylesheet, and `styles/content.css` is the root-scoped Tailwind components/utilities entry for injected content UI tokens, reset rules, and shadow-root CSS-text injection. Contents styling should continue to be injected from bundled CSS text into each shadow root, not re-read from page stylesheets.
- `assets/`
  Static icon assets used by the extension UI. `anime-bt-icon-speedline.svg` is the extension brand icon, packaged site icons for the options-page site-management cards are normalized to local `site-icon-*.(png|svg)` assets, and `icon.png` is the generated packaging icon consumed by Plasmo for extension icon sizes.
- `CHANGELOG.md`
  Canonical release notes for tagged versions. Each GitHub Release page should reuse the matching version section from this file. New release entries must summarize the changes from the previous version tag up to the new release commit.
- `lib/`
  Domain-organized shared logic:
  - `lib/background/` for batch orchestration, job-state helpers, and background-only services
  - `lib/content/` for source-page matching helpers and Shadow Root host/style orchestration
  - `lib/downloader/qb/` for qBittorrent WebUI client helpers and submission APIs
  - `lib/settings/` for defaults, sanitization, storage access, and source enablement helpers
  - `lib/shared/` for cross-runtime messages, shared types, and Tailwind utility helpers
- `.github/workflows/release.yml`
  Tagged-release automation that validates versions, packages the extension, extracts the matching `CHANGELOG.md` section, renames the packaged archive, and publishes the GitHub Release.
- `scripts/prepare-release.mjs`
  Release helper script that extracts version notes from `CHANGELOG.md`, renames the packaged zip artifact, and exposes the prepared paths to the workflow.
- `lib/sources/`
  Source adapter registry plus site-specific page matching and extraction logic, source delivery-mode capability helpers, and options-page site metadata.
- `lib/sources/matching.ts`
  Shared runtime source host definitions and host-matching helpers. Keep adapter and popup/runtime host recognition here; the content-script `config.matches` array must stay as a static literal in `contents/source-batch.tsx` for Plasmo to analyze correctly, and tests must keep both sides aligned.
- `tests/`
  Unit, component, and Playwright end-to-end coverage.
- `lib/history/`
  Task history persistence module, including type definitions, storage read/write, and automatic cleanup logic. Automatically saved by the background when a batch completes.
- `lib/background/retry.ts`
  Orchestration logic for retrying failed entries, extracting failed entries from history records and resubmitting to qBittorrent.
- `lib/background/popup.ts`
  Popup-specific background helpers for building popup view state, normalizing options routes, opening options tabs, persisting source enable/disable toggles from the popup, and syncing the current active tab after popup source toggles.
- `lib/shared/popup.ts`
  Shared popup view-model types and popup metadata constants reused across popup UI and background runtime handlers.
- `components/options/pages/history/`
  Batch history page components, including list view, detail view, retry button, and delete button.
- `components/options/ui/alert-dialog.tsx`
  AlertDialog component (shadcn/ui style), used for confirmation dialogs.
- `components/options/ui/confirmation-dialog.tsx`
  Confirmation dialog wrapper component, based on AlertDialog.

## Module Map

Use this section as the shortest runtime-oriented guide to the current code layout.

### Background Batch Request Flow

1. `contents/source-batch.tsx`
   Collects selected source-page items and sends `START_BATCH_DOWNLOAD`.
2. `background.ts`
   Routes the runtime message and injects concrete dependencies into `lib/background/`.
3. `lib/background/manager.ts`
   Validates the request, creates the batch job, coordinates concurrent preparation, and drives final submission.
4. `lib/background/preparation.ts`
   Normalizes selected items, classifies prepared links, and deduplicates extracted results before submission.
5. `lib/sources/extraction.ts`
   Delegates per-item detail-page extraction to the matched source adapter in `lib/sources/`.
6. `lib/downloader/qb/`
   Logs into qBittorrent, submits magnet or torrent URLs, and uploads torrent files when required.
7. `lib/background/job-state.ts`
   Tracks per-job stats, accumulates results, and produces the completion summary payload sent back to the content script.

### Popup Runtime Flow

1. `popup.tsx`
   Mounts the popup surface and loads popup styling.
2. `components/popup/PopupContainer.tsx`
   Requests popup state, drives popup actions, and sends popup-triggered runtime messages.
3. `background.ts`
   Routes popup runtime messages for state loading, source toggles, and options-page opening.
4. `lib/background/popup.ts`
   Builds popup view state from settings and active-tab context, applies source toggle writes, syncs current-tab source enablement state, and resolves options-route navigation targets.
5. `lib/shared/popup.ts`
   Provides popup view-model contracts and supported-site metadata shared between background and popup UI.

### Runtime Ownership

- `lib/background/`
  Background-only orchestration, job state, and service helpers.
- `lib/background/popup.ts`
  Popup-only background services for popup state assembly, source enablement writes, and options-page route navigation.
- `lib/content/`
  Content-script page matching, anchor extraction, and Shadow Root host/style utilities. Keep `shadow-root.ts` focused on host creation plus direct style injection into shadow roots; do not reintroduce document stylesheet readback as a runtime dependency.
- `lib/sources/`
  Source registry, site adapters, site metadata, and source delivery-mode capabilities.
- `lib/settings/`
  Default settings, sanitization, storage access, and source enablement resolution.
- `lib/downloader/qb/`
  qBittorrent WebUI client and submission APIs.
- `lib/shared/`
  Cross-runtime message contracts, shared types, and utility helpers used by multiple domains.
- `lib/shared/popup.ts`
  Popup-specific shared types and constants for popup state/view-model contracts.
- `lib/filter-rules/`
  Include-only filter matching and subgroup extraction logic, responsible for deciding whether a resource is kept before submission and shared by the options-page test bench.
- `lib/history/`
  Task history persistence, type definitions and storage logic, automatically saved by the background when a batch completes.

### Boundary Rules

- Runtime protocol constants and shared message/request types belong in `lib/shared/`.
- Source-specific parsing, page matching, and capability defaults belong in `lib/sources/`.
- Source host aliases and runtime host matching belong in `lib/sources/matching.ts`; keep `contents/source-batch.tsx` `config.matches` as a static wildcard literal for Plasmo, and use tests to prevent it from drifting away from the shared runtime host definitions.
- Batch orchestration belongs in `lib/background/`; source adapters should not take over job-level concerns.
- `lib/settings/` may normalize or persist settings, but qB/network behavior belongs outside it.
- Filters are stored in `Settings.filters`, but matching logic must remain in `lib/filter-rules/`; do not scatter rule judgments across options components or source adapters.
- `lib/content/` may help mount and scan pages, but downloader submission must stay out of content-side helpers.
- During development, prefer splitting code by responsibility instead of letting a single file keep growing; when a file starts carrying multiple concerns or becomes hard to hold in context, extract focused modules before adding more logic.

## Refactor Lessons Promoted To Policy

These constraints were learned during the `lib/`, `components/`, and contents-style refactors and should now be treated as normal project rules, not optional preferences.

### Runtime And Module Boundaries

- Keep `background.ts` thin: runtime listener + message routing + dependency wiring only. New orchestration logic belongs under `lib/background/`.
- Add new cross-runtime request/response types, helpers, and protocol constants in `lib/shared/`, not in runtime entry files.
- Keep tests aligned with ownership boundaries: `background`, `settings`, `shared`, `content`, and `sources` should each have direct tests for their own helpers instead of relying on indirect coverage from another domain.
- When a helper becomes pure derivation or normalization logic, prefer extracting it and testing it directly rather than growing page components or orchestration files.

### Contents Injection And Styling

- Contents UI styling must come from bundled CSS text injected directly into each shadow root. Do not reintroduce `document.styleSheets` readback or any page-stylesheet dependency.
- `styles/content.css` is limited to root-scoped tokens, low-specificity reset rules, `::selection`, and minimal root-level responsive constraints. Component visuals should live in `components/content-ui/*` and injected UI components, not in new component-level CSS selectors.
- Treat `checkbox`, `button`, `input`, and other native form controls in contents UI as high-risk controls. Keep reset scope explicit and low-specificity, and preserve native checkbox appearance unless there is a deliberate full custom replacement.
- Contents UI must stay isolated from options-page primitives unless a contents-specific variant is explicitly designed and verified. Code reuse is not a goal if it weakens cross-site stability.
- Prefer `px`-based sizing tokens for contents UI dimensions that must stay stable across `kisssub`, `dongmanhuayuan`, `acg.rip`, and `bangumi.moe`; avoid depending on host-page `rem` scaling for panel and checkbox metrics.
- When changing Shadow Root styling behavior, validate in real browser/E2E flows. `jsdom` is useful for regression coverage, but it is not sufficient evidence for Shadow DOM or adopted stylesheet behavior.

### Testing Expectations

- Prefer behavior- and contract-level assertions over DOM-shell assertions. Avoid pinning tests to tag names, icon internals, Tailwind class lists, or other replaceable structure unless that structure is the contract.
- For contents UI and E2E coverage, prefer stable `data-*` anchors and accessibility queries over semantic CSS classes or brittle nested selectors.
- Cross-site contents E2E checks should focus on stable runtime outcomes and agreed style signatures, not incidental layout implementation details.
- If a refactor changes module boundaries or UI composition without changing behavior, update tests to match the new ownership and contract surfaces instead of preserving stale implementation-level assertions.

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
  Playwright extension-level tests under `tests/e2e/`, including options-page coverage, list-page injection flows for all 4 supported BT sources, cross-site injected style consistency checks, and minimized-launcher hover transform regression checks.
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
