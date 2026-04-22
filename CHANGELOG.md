# Changelog

All notable release changes for `Anime BT Batch Downloader` are tracked here. GitHub Release pages should reuse the matching version section from this file.

## 2.2.0-beta.4

### Features

- Added a dedicated subscription-hits workspace with persisted hit history, selection-based downloads, notification deep links, and an activity-style UI so retained matches stay actionable after scans finish. (`259d8aa`, `16795b7`, `d4a7a23`, `ed6dd15`, `72b86b3`, `dd0d66a`)
- Added grouped options sidebar navigation so the expanding subscriptions workspace is easier to scan. (`5c9ec69`)

### Fixes

- Fixed subscription hit retention and download follow-through by preserving historical downloads, pruning stale notification rounds, refreshing round context and highlights, and keeping global-download cleanup aligned with retained rounds. (`180fd94`, `99e1dba`, `8a0bef0`, `6198353`, `77aa1da`)
- Fixed subscription definition and runtime consistency by blocking tombstone revival, restoring legacy reads, validating create/runtime payloads, keeping the no-edit model enforced, and hardening hit-download runtime boundaries. (`0080897`, `ade17f8`, `2e9e393`, `119dad9`, `22a1043`, `f108498`, `a0c1133`, `e76c3af`)
- Fixed subscription-hits queries and localization so new-status filtering, route params, and translated UI copy stay aligned in the workbench. (`87b51bf`, `fa6373e`, `4dee27f`)

### Refactor

- Refactored subscription persistence and UI feedback by introducing tombstoned records, narrower runtime actions, action-feedback wiring for the hits page, and removal of the legacy subscription upsert flow. (`fd2e830`, `68ab5c5`, `e252255`, `6bf18d4`)

## 2.2.0-beta.3

### Features

- Added background-based subscription candidate fetching for `acg.rip` and `bangumi.moe`, plus delayed detail extraction until retained-hit download time so subscription scans no longer depend on content tabs. (`a4f2921`, `12e8a06`, `29042b5`)

### Fixes

- Fixed subscription follow-through by tightening retained-notification handling, recovering from extraction exceptions during hit preparation, and removing leftover scan/runtime residue after the tab-scan removal. (`5bf4fe5`, `e756465`, `e65a58a`, `f692ecf`)
- Fixed the options overview capability summary so relocated subscription stats still render correctly after the subscription-scan pipeline changes. (`9956661`)

### Refactor

- Refactored the subscription scan pipeline to remove the content-tab scan protocol and the obsolete subscription delivery-mode setting, replacing them with focused background source fetchers and aligned test coverage. (`28e42a6`, `c4fc303`, `2615a0b`, `db230bb`)

## 2.2.0-beta.2

### Fixes

- Fixed dedicated settings-domain migrations and storage sanitization so legacy downloader, source, filter, batch, and subscription-policy data continue to load correctly after the options/config split. (`935474b`, `a40140f`, `ee7a3d6`, `081cffd`, `52248b5`, `fffcbab`, `d8f463d`)
- Fixed runtime settings follow-through by restoring popup/content sync, preserving custom KissSub scripts, serializing content refreshes, and making general settings saves atomic across coordinated writes. (`f80e86c`, `ab4562f`, `0c9d91d`)

### Refactor

- Refactored settings persistence into dedicated `filter_config`, `source_config`, `downloader_config`, `batch_execution_config`, `batch_ui_preferences`, and `subscription_policy_config` domains, removing legacy shared-settings plumbing from the runtime. (`c69ba5b`, `bde46ea`, `7977aa3`, `b37a338`, `38b7ebd`, `555cd13`, `a50307f`, `e201fd2`)
- Refactored the options workspace around per-domain workbenches, unified save actions/footer behavior, and dedicated background query surfaces for overview and batch runtime context. (`ad51619`, `667cd73`, `b74c005`)

## 2.2.0-beta.1

### Features

- Added first-class subscriptions with grouped multi-source scans, Dexie-backed scheduler/runtime retention, and notification-driven download follow-through across the options workspace and background runtime. (`680a8c1`, `c4ac6fe`)

### Fixes

- Fixed subscription polling and notification reliability by adding missing runtime permissions, honoring disabled sources, resetting edited and stale observation state, and hardening content/background scan RPC handshakes. (`416cda5`, `0f0711f`, `202ca5e`, `d09b354`, `df3fcf0`, `be1d2f5`, `533f1d0`)
- Fixed tagged beta and alpha release automation so prerelease tags validate against Chrome manifest `version_name`, extract the matching changelog section, and publish GitHub prereleases with correctly suffixed assets. (`88ff901`)

### Refactor

- Refactored subscription storage and preparation boundaries by merging the phased implementation, splitting settings/runtime persistence, simplifying recent-hit retention, and removing unpublished compatibility baggage. (`c5cbe8e`, `4f99351`, `cd6b1b8`, `ecc5ec7`)

## 2.1.0

### Features

- Added browser-locale-driven localization for manifest strings, popup, options, and injected batch UI with shared Simplified Chinese and English catalogs. (`d2ead32`)

### Fixes

- Fixed localized follow-through copy and history presentation so runtime guidance, retries, and recorded batch details stay consistent after the i18n rollout. (`8aa2d79`)
- Fixed downloader connectivity checks and submissions by requesting optional host permissions dynamically from the configured downloader host only when runtime access is needed. (`2dfe6c2`)

### Refactor

- Finalized the source-scoped filter model so rules persist through `sourceIds[]`, `must[]`, and optional `any[]` conditions consistently across sanitization, matching, and the options workbench. (`88b713a`)
- Refreshed the WXT test and tooling stack by integrating the Vitest plugin, stabilizing the full `test:all` flow and Playwright browser selection, and upgrading core npm dependencies before release. (`080f5aa`, `80ef392`, `cdbdad4`, `d873b44`, `7ed7d79`)

## 2.0.0

### Features

- Added downloader-first settings and Transmission support so batches can be routed through multiple downloader backends instead of qBittorrent only. (`710a08c`, `883de47`, `7c50a88`)
- Added the new filter strategy workbench, runtime eligibility checks, status surfacing, and presets so source-specific include/exclude rules can be configured before batch submission. (`5abc6c9`, `b8013bb`, `092ea9e`, `bc2c4b1`, `248dae0`, `36fe795`, `2427879`, `2788b5a`)

### Fixes

- Fixed filter evaluation and source scoping so runtime enforcement, subgroup extraction, and source operator behavior stay aligned across the workbench and batch pipeline. (`1fd929c`, `b6bc9b8`, `45df5c2`, `b81e0ff`, `af72d85`, `45c2c4e`, `14b7379`)
- Fixed downloader submission and history retry flows by hardening Transmission auth, clarifying retry contracts, handling partial URLs, and keeping helper-primed KissSub detail tabs fresh. (`290af2a`, `113c99b`, `3001812`, `3f80270`)
- Fixed the WXT migration aftermath by stabilizing content styles, dev startup, and manifest host permissions to match injectable source pages. (`78d7e48`, `fa311bf`)

### Refactor

- Migrated the extension from Plasmo to WXT and reorganized the project structure, settings storage, and source/runtime boundaries around the new build pipeline. (`2187dd2`, `8ab67f6`, `5d11a63`)
- Updated migration documentation to reflect the runtime behavior after the WXT transition. (`2b78251`)

## 1.5.0

### Features

- Added a dedicated extension popup for quick runtime checks, deep links into the hash-routed options workspace, and one-click source toggles on the active supported tab. (`3ea0ff6`, `3ed319c`)
- Added dynamic extension action icons that reflect whether the current page is supported so source-page readiness is visible before opening the popup. (`c4c2b77`)

### Fixes

- Fixed popup readiness detection by restoring source alias recognition, refreshing unsupported-page icon state after reloads, and aligning runtime source matching between popup checks and content injection. (`ac470f9`, `e53687b`, `709ddf3`)
- Fixed popup interactions so active-tab source toggles sync immediately with the injected UI, qBittorrent connection states are clearer, and running batches no longer blank the source controls. (`8c47e13`, `d6f4a08`, `4b047e1`)

### Refactor

- Simplified the popup implementation by removing the motion dependency, tightening popup layout polish, and extracting popup-specific background, shared-message, and routing helpers into focused modules with dedicated tests. (`bc800bb`, `a8dfc2c`)

## 1.4.0

### Features

- Added batch history persistence with detail, retry, and delete flows in the options workspace so completed jobs can be reviewed and resubmitted without returning to the source page. (`a423fa7`, `d100fbf`, `e5eb4ff`)
- Added configurable pre-submit filter rules with include/exclude matching, subgroup extraction, and delete confirmation so batches can be filtered before qBittorrent submission. (`397d4f7`, `be8570e`)
- Refreshed the options workspace and injected batch panel with Tailwind-based primitives, route-aware shells, and bottom-right expand/collapse motion. (`83b9fd8`, `2a273db`, `01a84a3`)

### Fixes

- Fixed filter-rule processing so filtered batches persist correctly, rules are re-evaluated after extraction and retry, and stored rule data is sanitized more robustly. (`41a0bd8`, `07bf580`, `af7ff55`)
- Fixed live-site extraction by aligning source selectors and correcting Dongmanhuayuan detail-page and history titles. (`146bde5`, `64c1f64`, `d59a27c`)
- Fixed UI regressions affecting injected hover transforms, hash-route behavior, retry error handling, and leftover Tailwind migration state. (`d567953`, `24df73b`, `733b9c2`, `df58674`)

### Refactor

- Reorganized shared modules by domain and unified runtime message responses so background, content, settings, and source responsibilities are clearer. (`7d3599c`, `42a1d41`, `1194a47`)
- Migrated options and content styling to Tailwind v4 and cleaned up shadow-root style injection so injected UI stays isolated across supported sites. (`d0fba15`, `15361f1`, `34bf841`, `c2e0cd9`)
- Simplified component boundaries and history construction by extracting focused helpers, aligning route-mode shells, and cleaning up supporting tests. (`2865c5d`, `ed4ccef`, `0397761`, `db2ce8e`, `dff78dc`)

## 1.3.0

### Features

- Added per-source enablement controls across the options workspace and runtime batch pipeline so disabled sites retain their saved configuration while batch UI injection and background processing stay blocked until re-enabled. (`dfb862d`, `28c573d`, `97094e9`, `bdb2d0c`, `fac700a`)
- Added a source overview summary and packaged site icons so the unified site-management view is easier to scan at a glance. (`b2ec69d`, `7806fd1`)
- Refined the extraction cadence settings panel so source-specific extraction behavior is clearer to configure. (`d98ffe7`)

### Fixes

- Fixed site-management state handling so source toggles refresh immediately and source metadata coverage stays aligned with the settings UI. (`6dc88ad`, `59be70a`, `da750e5`)

### Refactor

- Simplified the options workspace by removing legacy summary cards, streamlining site-configuration copy, and switching navigation to hash-routed `general`, `sites`, and `overview` views. (`6fba3e3`, `f60cb33`, `3dfff97`, `4be59b8`)
- Renamed the shared multi-source content script entry to the `source-batch` entrypoint so the runtime structure better reflects its responsibility. (`ea5a386`)

## 1.2.0

### Added

- Added the `bangumi.moe` source adapter to the source registry, content-page integration, and batch resolution flow so the extension now supports all 4 documented BT sources. (`c48d977`)

### Tests

- Added unit, component, and Playwright coverage for `bangumi.moe` list/search-page handling and related source registration behavior. (`c48d977`)

### Changed

- Simplified the options page copy so qBittorrent connection setup guidance is shorter and easier to scan. (`3012c4a`)

### Included Commits

- `c48d977` `feat: add bangumimoe support`
- `3012c4a` `refactor: simplify options page copy`

## 1.1.0

- Added the `acg.rip` source adapter and per-source delivery modes so torrent-first sites can skip unnecessary magnet handling.
- Refreshed the options workspace and floating batch panel for a clearer batch-download workflow.
- Updated the extension branding to the speedline icon set and refreshed UI controls with SCSS module styling and `react-icons`.
- Strengthened automated coverage across unit, component, and Playwright extension flows before the 1.1.0 release.

## 1.0.0

- Introduced the first packaged release of the extension for batching anime BT downloads into `qBittorrent WebUI`.
- Shipped supported source adapters for `kisssub.org` and `dongmanhuayuan.com`, with detail-page fallback extraction when a list page does not expose a usable download link.
- Added the floating batch-selection workflow with deduplication and optional per-batch save path override.
- Added the extension options UI for configuring and testing the qBittorrent WebUI connection.
