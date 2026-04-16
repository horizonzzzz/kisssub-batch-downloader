# AGENT.md

## Purpose

`Anime BT Batch Downloader` is a browser extension that batches downloads from supported anime BT source pages into the current downloader.

The extension injects selection UI into supported list pages, reuses direct magnet or torrent links when available, falls back to detail-page extraction when necessary, deduplicates results, and submits the final batch to either `qBittorrent WebUI` or `Transmission RPC`.

## Current Scope

- Supported source adapters: `kisssub.org`, `dongmanhuayuan.com`, `acg.rip`, `bangumi.moe`
- Supported source management in the options page:
  - `Downloader & Basic Settings`
    - rendered as a downloader-first workspace backed by persisted `currentDownloaderId` plus nested `downloaders` settings
    - users select the current downloader first, then edit the active downloader configuration block
    - `qBittorrent` and `Transmission` are available in the selector, and the UI/settings model remains structured for future downloader additions
  - `Site Configuration`
  - `Filter Rules`
    - rendered as a simplified filter workspace backed by persisted `filters`
    - each filter stores `sourceIds[]` as a required site scope plus two levels of text conditions: `must[]` for conditions that all need to match, and optional `any[]` for conditions where at least one must match
    - page interactions write through the shared settings form, and the quick test bench exercises the same include-only filter engine used by the runtime
  - `Subscriptions`
    - rendered as a first-class workspace backed by persisted subscription definitions plus scheduler, polling, notification, and recent-hit state in settings
    - supports grouped multi-source scans for subscription-capable sites, runtime status visibility, and notification-round retention for recent matched hits
  - `Batch History`
  - `Source Overview`
- Supported popup surface responsibilities:
  - loading extension runtime status for quick checks before opening options
  - probing current-downloader connectivity on the active supported/enabled source page, surfacing active-tab source support/enabled state, and linking to configuration when the connection check fails
  - popup-triggered downloader connectivity checks reuse the same runtime permission gate as the options page and batch pipeline, so missing downloader host access is requested before the probe runs
  - offering quick links into options routes and one-click enable/disable for the active supported source, with immediate sync to the current tab's injected UI
- Runtime UI copy is localized with `@wxt-dev/i18n` for Simplified Chinese and English:
  - the extension follows the browser UI language
  - no extension-level manual language switch is exposed
  - manifest strings, popup, options, and injected contents UI all resolve through the same locale catalogs
  - BT-site raw data, parser heuristics, and persisted history/source strings are not retroactively localized in storage
- the options workspace uses hash-routed navigation with:
  - `options.html#/general`
  - `options.html#/sites`
  - `options.html#/filters`
  - `options.html#/subscriptions`
  - `options.html#/history`
  - `options.html#/overview`
- Supported downloader targets: `qBittorrent WebUI` and `Transmission RPC`
- downloader host access is granted dynamically from the user-configured downloader `baseUrl`:
  - supported `http` and `https` hosts are requested through browser optional host permissions at connection-test time or before real submissions/retries
  - saving settings does not force a permission prompt; permission is requested only when the extension actually needs to reach the configured downloader host
- Optional per-batch save path override is supported
- Pre-submit filters can keep resources by selected source scope, title field, and subgroup text extracted from the list-page title
- When the current source has effective filters (rules whose `sourceIds[]` include that source), unmatched resources are blocked; when the current source has no effective filters, resources are allowed by default
- Magnet links are preferred; torrent URLs are the fallback
- `kisssub.org` detail-page extraction primes the site's helper cookies and reloads the hidden detail tab once when a fresh page still shows `开启虫洞`, so the first item in a cold batch can resolve like later items
- Each supported source can be enabled or disabled by the user:
  - disabled sources keep their saved per-site configuration
  - disabled sources do not inject the batch UI on matching pages
  - disabled sources are rejected again by the background batch pipeline
  - popup-driven source toggles should take effect on the current matching tab without requiring a manual page refresh
- Releases are published from semantic version tags, with GitHub Release notes sourced from `CHANGELOG.md`
- Release assets are uploaded as versioned Chrome MV3 zip archives named `anime-bt-batch-downloader-chrome-mv3-v<version>.zip`
- Known product gaps:
  - no task cancellation flow
  - no advanced downloader options such as qBittorrent tags/categories or Transmission labels

## Stack And Runtime Model

- `WXT`
- `React 19`
- `TypeScript`
- `@wxt-dev/i18n` for browser-locale-driven extension localization
- `Tailwind CSS` for the options UI layout and visual styling, plus scoped contents UI styling bundled once and mounted into WXT Shadow Root UIs
- lightweight `shadcn/ui`-style primitives built in-repo with `Radix UI`
- icon-library policy:
  - project-owned UI outside `src/components/ui/` should use `react-icons`
  - `src/components/ui/` primitives that come from the project's `shadcn/ui` pattern may keep `lucide-react` icons when introduced by shadcn
- `React Hook Form` + `zod` for the options settings form model and validation
- content-script UI mounts inside WXT-managed `Shadow Root` hosts so the injected batch panel and selection checkbox stay isolated from host-page styles while still using React roots
- injected contents UI styling is authored in `src/entrypoints/source-batch.content/style.css`, bundled by WXT into `content-scripts/source-batch.css`, then loaded once at runtime and reused across all injected Shadow Root UIs
- Browser-extension runtime with:
  - a background service worker entry in `src/entrypoints/background/index.ts`
  - a content script entry in `src/entrypoints/source-batch.content/index.tsx`
  - a popup entry in `src/entrypoints/popup/`
  - an options page entry in `src/entrypoints/options/`

## Source Of Truth Files

- `wxt.config.ts`
  WXT project configuration, including manifest metadata, downloader optional host permissions, React module registration, and build output paths.
- `src/entrypoints/background/index.ts`
  Boots the background runtime through WXT and delegates orchestration to `src/entrypoints/background/runtime.ts`.
- `src/entrypoints/options/`
  Boots the hash-routed options page; `main.tsx` mounts the React workspace and `api.ts` owns entry-local runtime message wiring.
- `src/entrypoints/popup/`
  Boots the popup page and mounts the popup container that drives popup actions via runtime message APIs, with the popup stylesheet colocated in the same entrypoint directory.
- `src/entrypoints/source-batch.content/index.tsx`
  WXT content-script entrypoint that registers source match patterns, imports `src/entrypoints/source-batch.content/style.css`, and starts the injected runtime in `src/entrypoints/source-batch.content/runtime.tsx`.
- `src/components/`
  UI components for the floating batch panel, popup surface, and selection checkbox. The root `src/components/batch-panel.tsx` now acts as the injected panel entry shell and delegates focused panel sections to `src/components/batch-panel/`; popup UI lives under `src/components/popup/`; the options workspace lives under `src/components/options/`, contents-specific primitives under `src/components/content-ui/`, and shared option-page primitives under `src/components/ui/`.
- `src/components/batch-panel/`
  Focused injected batch-panel sections and pure view-state helpers for launcher/header/summary/advanced/actions composition. Keep batch-panel-specific UI derivation here instead of growing `src/components/batch-panel.tsx` again.
- `src/components/popup/`
  Source of truth for popup container/state rendering and popup-only sections such as status, quick actions, supported-site list, and footer actions.
- `src/components/content-ui/`
  Contents-only Tailwind/shadcn-style primitives for the injected batch panel and selection checkbox visuals. Keep these isolated from `src/components/ui/` so third-party page injection stays on its own sizing, reset contract, and `data-*` test-anchor surface.
- `src/components/options/`
  Source of truth for the options workspace shell, hash-route config, form hooks/schema, shared options-only form fragments under `src/components/options/form/`, and the `general` / `sites` / `filters` / `subscriptions` / `overview` page implementations.
  Filtering rules UI lives under `src/components/options/pages/filters/` and persists simplified `filters` data through the shared settings form; drawers, cards, and the quick test bench all reflect the real include-only filter model and feed the backend filter engine. Subscription UI lives under `src/components/options/pages/subscriptions/` and renders persisted subscription settings alongside the background-provided runtime snapshot for scheduler runs, recent hits, and notification rounds.
- `src/components/ui/`
  Tailwind-first primitive components used by the options workspace, including buttons, inputs, cards, badges, alerts, switches, and radio groups.
- `src/styles/`
  `src/styles/tailwind-theme.css` is the shared Tailwind theme token entry imported by the entrypoint-local stylesheets under `src/entrypoints/options/`, `src/entrypoints/popup/`, and `src/entrypoints/source-batch.content/`.
- `src/assets/`
  Static icon assets used by the extension UI. `anime-bt-icon-speedline.svg` is the extension brand icon, packaged site icons for the options-page site-management cards are normalized to local `site-icon-*.(png|svg)` assets, and `icon.png` is the generated packaging icon copied to `public/` for WXT manifest icons.
- `CHANGELOG.md`
  Canonical release notes for tagged versions. Each GitHub Release page should reuse the matching version section from this file. New release entries must summarize the changes from the previous version tag up to the new release commit.
- `src/lib/`
  Domain-organized shared logic:
  - `src/lib/background/` for batch orchestration, subscription execution/download services, job-state helpers, downloader host-permission checks, and background-only services
  - `src/lib/content/` for source-page matching helpers and content-side selection/filter derivation
  - `src/lib/downloader/` for downloader adapter contracts, supported-downloader registry/meta, and downloader-facing shared types
  - `src/lib/downloader/qb/` for qBittorrent WebUI client helpers and submission APIs
  - `src/lib/settings/` for defaults, nested downloader settings merge/sanitization, storage access, and source enablement helpers
  - `src/lib/subscriptions/` for subscription definitions, runtime state persistence, grouped source scans, scheduler/alarm helpers, notification payloads, and recent-hit retention
  - `src/lib/shared/` for the WXT browser helper, cross-runtime messages, shared types, and Tailwind utility helpers
- `.github/workflows/release.yml`
  Tagged-release automation that validates versions, packages the extension, extracts the matching `CHANGELOG.md` section, renames the packaged archive, and publishes the GitHub Release.
- `scripts/prepare-release.mjs`
  Release helper script that extracts version notes from `CHANGELOG.md`, renames the packaged zip artifact, and exposes the prepared paths to the workflow.
- `src/lib/sources/`
  Source adapter registry plus site-specific page matching and extraction logic, source delivery-mode capability helpers, and options-page site metadata.
- `src/lib/sources/matching.ts`
  Shared runtime source host definitions and host-matching helpers. Keep adapter and popup/runtime host recognition here; the WXT content-script entrypoint should stay aligned with these shared wildcard patterns, and tests must keep both sides aligned.
- `tests/`
  Unit, component, and Playwright end-to-end coverage.
- `src/lib/history/`
  Task history persistence module, including type definitions, storage read/write, automatic cleanup logic, and downloader audit metadata such as the original downloader plus the most recent retry downloader. Automatically saved by the background when a batch completes.
- `src/lib/background/retry.ts`
  Orchestration logic for retrying failed entries, extracting failed entries from history records and resubmitting them with the current configured downloader while updating retry audit metadata on the history record.
- `src/entrypoints/background/runtime.ts`
  Background runtime registration helpers, including icon updates, runtime message listeners, subscription alarm reconciliation on startup/settings changes, alarm-triggered aggregated scans, and notification click-through download handling.
- `src/lib/background/subscriptions.ts`
  Background bridge for subscriptions, including serialized scan execution, downloader submission of notification hits, and persistence handoff between `src/lib/subscriptions/` state updates and downloader-facing batch preparation.
- `src/lib/background/popup.ts`
  Popup-specific background helpers for building popup view state, normalizing options routes, opening options tabs, persisting source enable/disable toggles from the popup, and syncing the current active tab after popup source toggles.
- `src/lib/shared/popup.ts`
  Shared popup view-model types and popup metadata constants reused across popup UI and background runtime handlers.
- `src/components/options/pages/history/`
  Batch history page components, including list view, detail view, retry button, and delete button.
- `src/components/ui/alert-dialog.tsx`
  AlertDialog component (shadcn/ui style), used for confirmation dialogs.

## Module Map

Use this section as the shortest runtime-oriented guide to the current code layout.

### Background Batch Request Flow

1. `src/entrypoints/source-batch.content/runtime.tsx`
   Collects selected source-page items and sends `START_BATCH_DOWNLOAD`.
2. `src/entrypoints/background/index.ts`
   Boots the WXT background entrypoint and registers the shared runtime.
3. `src/entrypoints/background/runtime.ts`
   Routes the runtime message and injects concrete dependencies into `src/lib/background/`.
4. `src/lib/background/manager.ts`
   Validates the request, creates the batch job, coordinates concurrent preparation, and drives final submission.
5. `src/lib/background/preparation.ts`
   Normalizes selected items, classifies prepared links, and deduplicates extracted results before submission.
6. `src/lib/sources/extraction.ts`
   Delegates per-item detail-page extraction to the matched source adapter in `src/lib/sources/`.
7. `src/lib/downloader/`
   Resolves the active downloader adapter and exposes the shared downloader contract used by background services.
8. `src/lib/downloader/qb/`
   Implements the qBittorrent adapter, including authentication, URL submission, torrent upload, and connection testing.
9. `src/lib/background/job-state.ts`
   Tracks per-job stats, accumulates results, and produces the completion summary payload sent back to the content script.

### Background Subscription Flow

1. `src/entrypoints/background/runtime.ts`
   Reconciles the scheduler alarm on startup/install/settings saves, responds to subscription runtime messages, and reacts to subscription notification clicks.
2. `src/lib/background/subscriptions.ts`
   Serializes subscription mutations, runs aggregated scans through `src/lib/subscriptions/`, and downloads retained hits through the active downloader when a notification round is opened.
3. `src/lib/subscriptions/scan.ts`
   Groups enabled subscriptions by source, runs one scan per source, updates runtime state, and creates retained notification rounds from newly discovered hits.
4. `src/lib/subscriptions/source-scan.ts`
   Opens background list tabs only for subscription-capable sources, fetches list-page candidates, and normalizes/deduplicates scan results before matching.
5. `src/lib/subscriptions/scheduler.ts` and `src/lib/subscriptions/notifications.ts`
   Own the alarm cadence plus notification id/payload construction and round retention for recent hits.

### Popup Runtime Flow

1. `src/entrypoints/popup/`
   Mounts the popup surface and loads popup styling through WXT.
2. `src/components/popup/PopupContainer.tsx`
   Requests popup state, drives popup actions, and sends popup-triggered runtime messages.
3. `src/entrypoints/background/runtime.ts`
   Routes popup runtime messages for state loading, source toggles, and options-page opening.
4. `src/lib/background/popup.ts`
   Builds popup view state from settings and active-tab context, applies source toggle writes, syncs current-tab source enablement state, and resolves options-route navigation targets.
5. `src/lib/shared/popup.ts`
   Provides popup view-model contracts and supported-site metadata shared between background and popup UI.

### Runtime Ownership

- `src/lib/background/`
  Background-only orchestration, job state, and service helpers for both batch downloads and subscriptions.
- `src/entrypoints/background/runtime.ts`
  Background runtime registration for the WXT entrypoint, tab/icon lifecycle hooks, subscription alarm listeners, and notification click actions.
- `src/lib/background/popup.ts`
  Popup-only background services for popup state assembly, source enablement writes, and options-page route navigation.
- `src/lib/content/`
  Content-script page matching, anchor extraction, and selection/filter derivation helpers. WXT Shadow Root UI lifecycle now lives in `src/entrypoints/source-batch.content/runtime.tsx`; do not reintroduce document stylesheet readback or per-mount uncached stylesheet loading.
- `src/lib/sources/`
  Source registry, site adapters, site metadata, and source delivery-mode capabilities.
- `src/lib/settings/`
  Default settings, sanitization, storage access, and source enablement resolution.
- `src/lib/subscriptions/`
  Subscription definitions, runtime state persistence, grouped scans, scheduler helpers, notifications, and recent-hit retention.
- `src/lib/downloader/`
  Downloader adapter registry, supported-downloader metadata, and downloader-facing shared types.
- `src/lib/downloader/qb/`
  qBittorrent WebUI client and submission APIs.
- `src/lib/shared/`
  Cross-runtime message contracts, shared types, and utility helpers used by multiple domains.
- `src/lib/shared/popup.ts`
  Popup-specific shared types and constants for popup state/view-model contracts.
- `src/lib/filter-rules/`
  Include-only filter matching and subgroup extraction logic, responsible for deciding whether a resource is kept before submission and shared by the options-page test bench.
- `src/lib/history/`
  Task history persistence, type definitions and storage logic, automatically saved by the background when a batch completes.

### Boundary Rules

- Runtime protocol constants and shared message/request types belong in `src/lib/shared/`.
- Source-specific parsing, page matching, and capability defaults belong in `src/lib/sources/`.
- Source host aliases and runtime host matching belong in `src/lib/sources/matching.ts`; keep the WXT content-script entrypoint aligned with these shared wildcard patterns, and use tests to prevent drift.
- Batch orchestration belongs in `src/lib/background/`; source adapters should not take over job-level concerns.
- `src/lib/settings/` may normalize or persist settings, but qB/network behavior belongs outside it.
- Subscription matching, grouped scans, runtime-state retention, scheduler cadence, and notification-round retention belong in `src/lib/subscriptions/`; downloader submission of retained hits belongs in `src/lib/background/subscriptions.ts`.
- Filters are stored in `Settings.filters`, but matching logic must remain in `src/lib/filter-rules/`; do not scatter rule judgments across options components or source adapters.
- `src/lib/content/` may help mount and scan pages, but downloader submission must stay out of content-side helpers.
- During development, prefer splitting code by responsibility instead of letting a single file keep growing; when a file starts carrying multiple concerns or becomes hard to hold in context, extract focused modules before adding more logic.

## Refactor Lessons Promoted To Policy

These constraints were learned during the `src/lib/`, `src/components/`, and contents-style refactors and should now be treated as normal project rules, not optional preferences.

### Runtime And Module Boundaries

- Keep `src/entrypoints/background/index.ts` thin: WXT bootstrap + dependency wiring only. New orchestration logic belongs under `src/lib/background/`.
- Add new cross-runtime request/response types, helpers, and protocol constants in `src/lib/shared/`, not in runtime entry files.
- Keep tests aligned with ownership boundaries: `background`, `settings`, `shared`, `content`, and `sources` should each have direct tests for their own helpers instead of relying on indirect coverage from another domain.
- When a helper becomes pure derivation or normalization logic, prefer extracting it and testing it directly rather than growing page components or orchestration files.

### Contents Injection And Styling

- Contents UI styling must be authored in `src/entrypoints/source-batch.content/style.css`, emitted by WXT as the content-script CSS asset, and reused by `createShadowRootUi` from a cached runtime load. Do not reintroduce document stylesheet readback, per-checkbox stylesheet fetches, or any page-stylesheet dependency.
- `src/entrypoints/source-batch.content/style.css` is limited to root-scoped tokens, low-specificity reset rules, `::selection`, and minimal root-level responsive constraints. Component visuals should live in `src/components/content-ui/*` and injected UI components, not in new component-level CSS selectors.
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

- `.wxt/`
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
- Do not migrate `lucide-react` icons that are introduced by `shadcn/ui` inside `src/components/ui/` only for icon-library consistency. Outside `src/components/ui/`, prefer `react-icons` for project-owned UI.
- If a change updates the extension branding or icon pipeline, keep `src/assets/anime-bt-icon-speedline.svg` and the generated `src/assets/icon.png` aligned in the same change.
- If a code change makes any statement in this file stale, update `AGENTS.md` before finishing the task.
