# Anime BT Batch Downloader

[English](README.md) | [简体中文](README.zh-CN.md)

Anime BT Batch Downloader is an open-source browser extension for batching downloads from supported anime BT source pages into qBittorrent. It injects lightweight selection UI on list pages, opens selected detail pages in the background, resolves the real magnet or torrent links, deduplicates entries, and submits the final batch to `qBittorrent WebUI`.

Built with `Plasmo + React 19 + TypeScript`, the project is organized around source adapters so the extension can evolve from a single-site workflow into a reusable multi-source anime BT tool.

## Features

- Batch-select posts directly from supported anime BT source list pages
- Current source adapters: `kisssub.org` and `dongmanhuayuan.com`
- Resolve the real download link from each detail page through source-specific extraction logic
- Prefer magnet links and fall back to torrent URLs when needed
- Deduplicate items by `btih` hash or final URL before submission
- Submit selected items to `qBittorrent WebUI` in one batch
- Optionally override qBittorrent's download path for the current batch

## Supported Sources

- `kisssub.org`
- `dongmanhuayuan.com`

## Requirements

- Node.js
- pnpm
- A Chromium-based browser such as `Chrome` or `Edge`
- qBittorrent with `WebUI` enabled

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

## Configure qBittorrent WebUI

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

## Usage

1. Open a supported source list page
2. Select the posts you want
3. Optionally enter a per-batch save path in the floating panel
4. Click `批量下载`

The extension will then:

1. Open the selected detail pages in background tabs
2. Inject a remote helper script where required
3. Resolve the actual magnet or torrent URLs
4. Deduplicate repeated entries
5. Submit the final batch to qBittorrent

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

- `background.ts`: service worker and batch orchestration
- `contents/`: content script entry and injected styles
- `components/`: floating batch panel and options page UI
- `lib/sources/`: source adapters and source-specific extraction helpers
- `lib/`: shared settings, qB API helpers, and batch helpers
- `tests/`: unit, component, and Playwright E2E coverage

## Testing

Run the full verification suite before submitting changes:

```bash
pnpm test:all
```

The current automated coverage includes source detection, candidate normalization, detail extraction behavior, qBittorrent submission flows, options page behavior, and extension-level E2E checks.

## Known Limitations

- qBittorrent is still the only supported downloader
- No task cancellation flow yet
- No advanced qBittorrent parameters such as tags or categories
- `kisssub` extraction still depends on the current behavior of third-party helper scripts and upstream pages

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for details.
