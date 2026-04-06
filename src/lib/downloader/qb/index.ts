import type { DownloaderAdapter } from "../types"
import { loginQb, qbFetchText } from "./client"
import { getQbLoginErrorMessage } from "./errors"
import { addTorrentFilesToQb, addUrlsToQb } from "./submission"
export type { QbTorrentFile } from "./types"

export const qbDownloaderAdapter: DownloaderAdapter = {
  id: "qbittorrent",
  displayName: "qBittorrent",
  authenticate: loginQb,
  addUrls: addUrlsToQb,
  addTorrentFiles: addTorrentFilesToQb,
  async testConnection(settings) {
    await loginQb(settings)
    const version = await qbFetchText(settings, "/api/v2/app/version", { method: "GET" })

    return {
      baseUrl: settings.downloaders.qbittorrent.baseUrl,
      version: version.trim() || "unknown"
    }
  }
}

export { qbFetchText, loginQb } from "./client"
export { getQbLoginErrorMessage } from "./errors"
export { addTorrentFilesToQb, addUrlsToQb } from "./submission"
