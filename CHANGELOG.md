# Changelog

All notable release changes for `Anime BT Batch Downloader` are tracked here. GitHub Release pages should reuse the matching version section from this file.

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
