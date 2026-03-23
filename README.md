# Kisssub Batch Downloader

Kisssub Batch Downloader is a browser extension for supported BT source list pages. It injects selection checkboxes into source-specific detail entries, opens each selected detail page in the background, resolves the real magnet or torrent link, and submits the batch to `qBittorrent WebUI`.

The project is built with `Plasmo + React 19 + TypeScript`, keeps the injected page UI lightweight, and includes automated tests for the extension worker, content script UI, and options page.

## Features

- Batch-select supported posts directly from list pages
- Current source support: `kisssub` and `dongmanhuayuan`
- Resolve real download links from detail pages through source-specific extraction logic
- Prefer magnet links and fall back to torrent URLs
- Deduplicate by `btih` hash or URL before submission
- Send selected items to `qBittorrent WebUI` in one batch
- Override qB's default download path per batch by manually entering a path

## Requirements

- Node.js
- pnpm
- Chromium-based browser (`Chrome` or `Edge`)
- qBittorrent with WebUI enabled

## Installation

### Load the extension locally

1. Install dependencies:

```bash
pnpm install
```

2. Build the extension:

```bash
pnpm build
```

3. Open `chrome://extensions` or `edge://extensions`
4. Enable Developer Mode
5. Choose `Load unpacked`
6. Select `build/chrome-mv3-prod`

### Configure qBittorrent WebUI

1. Open `qBittorrent -> Tools / Options / WebUI`
2. Enable WebUI
3. Fill the extension options page with:
   - `qBittorrent WebUI` URL
   - username
   - password
4. Use `测试 qB 连接` to verify connectivity

If WebUI is used only on the local machine and the extension still gets `401`, disable:

- `Enable Cross-Site Request Forgery (CSRF) protection`
- `Host header validation` if needed

## Download Path Support

The floating batch panel includes a manual download path input.

- Leave it empty to use qBittorrent's default download directory
- Enter an absolute path when you want this batch to use a different `savepath`
- If qBittorrent runs on another machine, enter a path that the qBittorrent host can actually resolve

## Usage

1. Open a supported source list page
2. Select the posts you want
3. Optionally set a per-batch save path in the floating panel
4. Click `批量下载`

The extension will:

1. Open each detail page in background tabs
2. Inject the remote helper script if needed
3. Resolve the real magnet or torrent URL
4. Deduplicate repeated entries
5. Submit the final list to qBittorrent

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

### Project structure

- `background.ts`: extension service worker and batch orchestration
- `contents/`: content script entry and injected CSS
- `components/`: options page UI and floating batch panel UI
- `lib/sources/`: source adapters and detail extraction helpers
- `lib/`: shared settings, qB API helpers and batch helpers
- `tests/`: unit, component and Playwright E2E tests

## Testing

Run the full verification suite before submitting changes:

```bash
pnpm test:all
```

Current coverage includes:

- settings normalization
- source registry and source-aware candidate normalization
- dongmanhuayuan detail parsing behavior
- qB login and submission behavior
- batch panel interactions
- options page save flow
- extension loading and content script injection fixtures through Playwright

## Known Limitations

- qBittorrent is still the only downloader
- No task cancellation
- No advanced qB parameters such as tags or categories
- `kisssub` extraction still depends on the current behavior of third-party `acgscript` and related upstream pages
