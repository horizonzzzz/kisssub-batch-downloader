import type { DownloaderId, Settings } from "../shared/types"

export type DownloaderSubmitOptions = {
  savePath?: string
}

export type DownloaderTorrentFile = {
  filename: string
  blob: Blob
}

export type DownloaderConnectionResult = {
  baseUrl: string
  version: string
}

export type DownloaderUrlSubmissionEntry = {
  url: string
  status: "submitted" | "failed"
  error?: string
}

export type DownloaderUrlSubmissionResult = {
  entries: DownloaderUrlSubmissionEntry[]
}

export type DownloaderAdapter = {
  id: DownloaderId
  displayName: string
  authenticate: (settings: Settings) => Promise<void>
  addUrls: (
    settings: Settings,
    urls: string[],
    options?: DownloaderSubmitOptions
  ) => Promise<DownloaderUrlSubmissionResult>
  addTorrentFiles: (
    settings: Settings,
    torrents: DownloaderTorrentFile[],
    options?: DownloaderSubmitOptions
  ) => Promise<void>
  testConnection: (settings: Settings) => Promise<DownloaderConnectionResult>
}
