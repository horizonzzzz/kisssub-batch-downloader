import type { QbTorrentFile } from "../downloader/qb"

export async function fetchTorrentForUpload(
  torrentUrl: string,
  fetchImpl: typeof fetch = fetch
): Promise<QbTorrentFile> {
  const response = await fetchImpl(torrentUrl, {
    credentials: "include"
  })

  if (!response.ok) {
    throw new Error(`Torrent download failed with HTTP ${response.status}.`)
  }

  const blob = await response.blob()
  return {
    filename: getTorrentFilename(torrentUrl, response.headers.get("content-disposition")),
    blob
  }
}

export function getTorrentFilename(torrentUrl: string, contentDisposition: string | null): string {
  const fromHeader = String(contentDisposition ?? "").match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)
  if (fromHeader?.[1]) {
    return decodeURIComponent(fromHeader[1].replace(/"/g, "")).trim()
  }

  try {
    const pathname = new URL(torrentUrl).pathname
    const filename = pathname.split("/").pop() || ""
    if (filename) {
      return filename
    }
  } catch {
    // Fall back to the generic filename below.
  }

  return "download.torrent"
}
