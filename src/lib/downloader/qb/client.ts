import type { Settings } from "../../shared/types"
import { getQbLoginErrorMessage } from "./errors"

type FetchLike = typeof fetch

function getQbSettings(settings: Settings) {
  return settings.downloaders.qbittorrent
}

export async function loginQb(settings: Settings, fetchImpl: FetchLike = fetch): Promise<void> {
  const qbSettings = getQbSettings(settings)
  const body = new URLSearchParams()
  body.set("username", qbSettings.username)
  body.set("password", qbSettings.password)

  const response = await fetchImpl(`${qbSettings.baseUrl}/api/v2/auth/login`, {
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

export async function qbFetchText(
  settings: Settings,
  path: string,
  init?: RequestInit,
  fetchImpl: FetchLike = fetch
): Promise<string> {
  const qbSettings = getQbSettings(settings)
  const response = await fetchImpl(`${qbSettings.baseUrl}${path}`, {
    credentials: "include",
    ...init
  })

  if (!response.ok) {
    throw new Error(`qBittorrent request failed with HTTP ${response.status}.`)
  }

  return response.text()
}
