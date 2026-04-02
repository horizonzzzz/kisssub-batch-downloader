# Changelog

All notable release changes for `Anime BT Batch Downloader` are tracked here. GitHub Release pages should reuse the matching version section from this file.

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
