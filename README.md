# Anime BT Batch Downloader

[English](README.md) | [简体中文](README.zh-CN.md)

Anime BT Batch Downloader is an open-source browser extension for batching downloads from supported anime BT source pages into the currently selected downloader. It injects lightweight selection UI on list pages, prefers already-exposed magnet or torrent links when a source page provides them, falls back to background detail-page extraction when needed, deduplicates entries, and submits the final batch to either `qBittorrent WebUI` or `Transmission RPC`.

Built with `WXT + React 19 + TypeScript`, the project is organized around source adapters so the extension can evolve from a single-site workflow into a reusable multi-source anime BT tool.

## Features

- Batch-select posts directly from supported anime BT source list pages
- Current source adapters: `kisssub.org`, `dongmanhuayuan.com`, `acg.rip`, and `bangumi.moe`
- Prefer list-page download links when a source already exposes stable `.torrent` URLs
- Resolve the real download link from each detail page through source-specific extraction logic when direct list-page submission is unavailable
- Prefer magnet links and fall back to torrent URLs when needed
- Deduplicate items by `btih` hash or final URL before submission
- Submit selected items to the active downloader in one batch
- Supported downloaders: `qBittorrent WebUI` and `Transmission RPC`
- Optionally override the active downloader's download path for the current batch

## Supported Sources

- `kisssub.org`
- `dongmanhuayuan.com`
- `acg.rip`
- `bangumi.moe`

## Requirements

- Node.js
- pnpm
- A Chromium-based browser such as `Chrome` or `Edge`
- qBittorrent with `WebUI` enabled, or Transmission with `RPC` enabled

## Installation

### 1. Install dependencies

```bash
pnpm install
```

### 2. Build the extension

```bash
pnpm build
```

### 3. Load the extension locally

1. Open `chrome://extensions` or `edge://extensions`
2. Enable Developer Mode
3. Click `Load unpacked`
4. Select `build/chrome-mv3-prod`

## Configure a Downloader

### qBittorrent WebUI

1. Open `qBittorrent -> Tools / Options / WebUI`
2. Enable `WebUI`
3. Open the extension options page and fill in:
   - `qBittorrent WebUI` URL
   - username
   - password
4. Use `测试 qB 连接` to verify connectivity

Default local URL example:

```text
http://127.0.0.1:7474
```

If qBittorrent is only used on the local machine and the extension still receives `401`, review these WebUI options:

- `Enable Cross-Site Request Forgery (CSRF) protection`
- `Host header validation`

### Transmission RPC

1. Enable Transmission's RPC service
2. Open the extension options page and switch the current downloader to `Transmission`
3. Fill in:
   - `Transmission RPC` URL
   - username
   - password
4. Use `测试 Transmission 连接` to verify connectivity

Default local URL example:

```text
http://127.0.0.1:9091/transmission/rpc
```

## Usage

1. Open a supported source list page
2. Select the posts you want
3. Optionally enter a per-batch save path in the floating panel
4. Click `批量下载`

The extension will then:

1. Reuse direct magnet or `.torrent` links from the list page when available
2. Otherwise open the selected detail pages in background tabs
3. Inject a remote helper script where required
4. Resolve the actual magnet or torrent URLs
5. Deduplicate repeated entries
6. Submit the final batch to the active downloader

## Development

### Scripts

```bash
pnpm dev
pnpm build
pnpm package
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm test:all
```

### Project Structure

- `src/entrypoints/background/`: WXT background entrypoint plus background-only runtime bootstrap
- `src/entrypoints/popup/` and `src/entrypoints/options/`: WXT HTML + React entrypoints with colocated style files
- `src/entrypoints/source-batch.content/`: WXT content-script entrypoint, runtime bootstrap, and content style entry
- `src/components/`: floating batch panel and options page UI
- `src/lib/sources/`: source adapters and source-specific extraction helpers
- `src/lib/`: shared settings, downloader adapters, runtime messaging, and batch helpers
- `tests/`: unit, component, and Playwright E2E coverage

## Testing

Run the full verification suite before submitting changes:

```bash
pnpm test:all
```

The current automated coverage includes source detection, candidate normalization, detail extraction behavior, qBittorrent and Transmission submission flows, options page behavior, and extension-level E2E checks.

## Known Limitations

- No task cancellation flow yet
- No advanced downloader parameters such as qBittorrent tags/categories or Transmission labels
- `kisssub` extraction still depends on the current behavior of third-party helper scripts and upstream pages

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
