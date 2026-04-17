import type { AppSettings, DownloaderId } from "../shared/types"

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
  status: "submitted" | "duplicate" | "failed"
  error?: string
}

export type DownloaderUrlSubmissionResult = {
  entries: DownloaderUrlSubmissionEntry[]
}

export type DownloaderAdapter = {
  id: DownloaderId
  displayName: string
  authenticate: (settings: AppSettings) => Promise<void>
  addUrls: (
    settings: AppSettings,
    urls: string[],
    options?: DownloaderSubmitOptions
  ) => Promise<DownloaderUrlSubmissionResult>
  addTorrentFiles: (
    settings: AppSettings,
    torrents: DownloaderTorrentFile[],
    options?: DownloaderSubmitOptions
  ) => Promise<void>
  testConnection: (settings: AppSettings) => Promise<DownloaderConnectionResult>
}
