import type { DownloaderConfig } from "../config/types"
import { getQbLoginErrorMessage } from "./errors"

type FetchLike = typeof fetch

function getQbProfile(config: DownloaderConfig) {
  return config.profiles.qbittorrent
}

async function submitQbLogin(
  config: DownloaderConfig,
  credentialsMode: RequestCredentials,
  fetchImpl: FetchLike
): Promise<void> {
  const qbProfile = getQbProfile(config)
  const body = new URLSearchParams()
  body.set("username", qbProfile.username)
  body.set("password", qbProfile.password)

  const response = await fetchImpl(`${qbProfile.baseUrl}/api/v2/auth/login`, {
    method: "POST",
    credentials: credentialsMode,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
    },
    body: body.toString()
  })

  if (!response.ok) {
    throw new Error(getQbLoginErrorMessage(response.status, config))
  }

  const text = await response.text()
  if (!/^ok/i.test(text.trim())) {
    throw new Error(`qBittorrent login rejected the credentials: ${text.trim() || "unknown response"}`)
  }
}

export async function loginQb(
  config: DownloaderConfig,
  fetchImpl: FetchLike = fetch
): Promise<void> {
  // Verify the submitted credentials without any ambient qB cookie first,
  // then establish the cookie-backed session used by subsequent API calls.
  await submitQbLogin(config, "omit", fetchImpl)
  await submitQbLogin(config, "include", fetchImpl)
}

export async function qbFetchText(
  config: DownloaderConfig,
  path: string,
  init?: RequestInit,
  fetchImpl: FetchLike = fetch
): Promise<string> {
  const qbProfile = getQbProfile(config)
  const response = await fetchImpl(`${qbProfile.baseUrl}${path}`, {
    credentials: "include",
    ...init
  })

  if (!response.ok) {
    throw new Error(`qBittorrent request failed with HTTP ${response.status}.`)
  }

  return response.text()
}
