import type { Settings } from "../../shared/types"
import type { QbTorrentFile } from "./types"

type FetchLike = typeof fetch

export async function addUrlsToQb(
  settings: Settings,
  urls: string[],
  options: {
    savePath?: string
  } = {},
  fetchImpl: FetchLike = fetch
): Promise<void> {
  if (!urls.length) {
    return
  }

  const formData = new FormData()
  formData.append("urls", urls.join("\n"))
  const savePath = String(options.savePath ?? "").trim()
  if (savePath) {
    formData.append("savepath", savePath)
  }

  const response = await fetchImpl(`${settings.qbBaseUrl}/api/v2/torrents/add`, {
    method: "POST",
    credentials: "include",
    body: formData
  })

  if (!response.ok) {
    throw new Error(`qBittorrent rejected the batch add request with HTTP ${response.status}.`)
  }
}

export async function addTorrentFilesToQb(
  settings: Settings,
  torrents: QbTorrentFile[],
  options: {
    savePath?: string
  } = {},
  fetchImpl: FetchLike = fetch
): Promise<void> {
  if (!torrents.length) {
    return
  }

  const formData = new FormData()
  for (const torrent of torrents) {
    formData.append(
      "torrents",
      new File([torrent.blob], torrent.filename, {
        type: torrent.blob.type || "application/x-bittorrent"
      })
    )
  }

  const savePath = String(options.savePath ?? "").trim()
  if (savePath) {
    formData.append("savepath", savePath)
  }

  const response = await fetchImpl(`${settings.qbBaseUrl}/api/v2/torrents/add`, {
    method: "POST",
    credentials: "include",
    body: formData
  })

  if (!response.ok) {
    throw new Error(`qBittorrent rejected the torrent file upload with HTTP ${response.status}.`)
  }
}
