import type { AppSettings } from "../../shared/types"
import type { DownloaderUrlSubmissionResult } from "../types"
import type { TransmissionTorrentFile } from "./types"
import { transmissionRpc } from "./client"

type FetchLike = typeof fetch

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== "string") {
        reject(new Error("Failed to read torrent file for Transmission."))
        return
      }
      resolve(result.split(",")[1] ?? "")
    }
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read torrent file for Transmission."))
    reader.readAsDataURL(blob)
  })
}

export async function addUrlsToTransmission(
  settings: AppSettings,
  urls: string[],
  options: { savePath?: string } = {},
  fetchImpl: FetchLike = fetch
): Promise<DownloaderUrlSubmissionResult> {
  const entries: DownloaderUrlSubmissionResult["entries"] = []

  for (const url of urls) {
    try {
      await transmissionRpc(settings, "torrent-add", {
        filename: url,
        ...(options.savePath ? { "download-dir": options.savePath } : {})
      }, fetchImpl)
      entries.push({
        url,
        status: "submitted"
      })
    } catch (error: unknown) {
      const failure = error instanceof Error ? error.message : String(error)

      entries.push({
        url,
        status: "failed",
        error: failure
      })
    }
  }

  return { entries }
}

export async function addTorrentFilesToTransmission(
  settings: AppSettings,
  torrents: TransmissionTorrentFile[],
  options: { savePath?: string } = {},
  fetchImpl: FetchLike = fetch
): Promise<void> {
  for (const torrent of torrents) {
    await transmissionRpc(settings, "torrent-add", {
      metainfo: await toBase64(torrent.blob),
      ...(options.savePath ? { "download-dir": options.savePath } : {})
    }, fetchImpl)
  }
}
