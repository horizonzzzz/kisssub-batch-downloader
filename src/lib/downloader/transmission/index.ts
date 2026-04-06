import type { DownloaderAdapter } from "../types"
import { authenticateTransmission, transmissionRpc } from "./client"
import { addTorrentFilesToTransmission, addUrlsToTransmission } from "./submission"

export const transmissionDownloaderAdapter: DownloaderAdapter = {
  id: "transmission",
  displayName: "Transmission",
  authenticate: authenticateTransmission,
  addUrls: addUrlsToTransmission,
  addTorrentFiles: addTorrentFilesToTransmission,
  async testConnection(settings, fetchImpl = fetch) {
    const result = await transmissionRpc<{ version?: string }>(
      settings,
      "session-get",
      {},
      fetchImpl
    )

    return {
      baseUrl: settings.downloaders.transmission.baseUrl,
      version: result.arguments?.version?.trim() || "unknown"
    }
  }
}

export { authenticateTransmission, transmissionRpc } from "./client"
export { addTorrentFilesToTransmission, addUrlsToTransmission } from "./submission"
