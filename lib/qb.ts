import type { Settings } from "./types"

type FetchLike = typeof fetch

export type QbTorrentFile = {
  filename: string
  blob: Blob
}

export async function loginQb(settings: Settings, fetchImpl: FetchLike = fetch): Promise<void> {
  const body = new URLSearchParams()
  body.set("username", settings.qbUsername)
  body.set("password", settings.qbPassword)

  const response = await fetchImpl(`${settings.qbBaseUrl}/api/v2/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    },
    body: body.toString()
  })

  if (!response.ok) {
    throw new Error(getQbLoginErrorMessage(response.status, settings))
  }

  const text = await response.text()
  if (!/^ok/i.test(text.trim())) {
    throw new Error(`qBittorrent login rejected the credentials: ${text.trim() || "unknown response"}`)
  }
}

export function getQbLoginErrorMessage(
  status: number,
  settings: Pick<Settings, "qbBaseUrl">
): string {
  if (status === 401) {
    return [
      `qBittorrent login failed with HTTP 401 at ${settings.qbBaseUrl}.`,
      "First confirm the WebUI username and password are correct.",
      "If this WebUI is only used locally from a browser extension, disable `Enable Cross-Site Request Forgery (CSRF) protection` in qBittorrent WebUI settings and test again.",
      "If it still fails, disable `Host header validation` and test again."
    ].join(" ")
  }

  return `qBittorrent login failed with HTTP ${status}.`
}

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

export async function qbFetchText(
  settings: Settings,
  path: string,
  init?: RequestInit,
  fetchImpl: FetchLike = fetch
): Promise<string> {
  const response = await fetchImpl(`${settings.qbBaseUrl}${path}`, {
    credentials: "include",
    ...init
  })

  if (!response.ok) {
    throw new Error(`qBittorrent request failed with HTTP ${response.status}.`)
  }

  return response.text()
}
