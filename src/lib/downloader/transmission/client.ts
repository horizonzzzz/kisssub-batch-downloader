import type { AppSettings } from "../../shared/types"

type FetchLike = typeof fetch

type TransmissionRpcSuccess<TArguments = Record<string, unknown>> = {
  result: string
  arguments?: TArguments
}

function getTransmissionSettings(settings: AppSettings) {
  return settings.downloaders.transmission
}

function encodeBase64Utf8(value: string): string {
  let binary = ""

  for (const byte of new TextEncoder().encode(value)) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

function buildAuthHeader(settings: AppSettings): string | null {
  const { username, password } = getTransmissionSettings(settings)
  if (!username && !password) {
    return null
  }

  return `Basic ${encodeBase64Utf8(`${username}:${password}`)}`
}

function buildHeaders(settings: AppSettings, sessionId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  }

  if (sessionId) {
    headers["X-Transmission-Session-Id"] = sessionId
  }

  const authHeader = buildAuthHeader(settings)
  if (authHeader) {
    headers.Authorization = authHeader
  }

  return headers
}

export async function transmissionRpc<TArguments = Record<string, unknown>>(
  settings: AppSettings,
  method: string,
  args: Record<string, unknown> = {},
  fetchImpl: FetchLike = fetch,
  sessionId?: string
): Promise<TransmissionRpcSuccess<TArguments>> {
  const transmissionSettings = getTransmissionSettings(settings)
  const response = await fetchImpl(transmissionSettings.baseUrl, {
    method: "POST",
    headers: buildHeaders(settings, sessionId),
    body: JSON.stringify({
      method,
      arguments: args
    })
  })

  if (response.status === 409) {
    const nextSessionId = response.headers.get("X-Transmission-Session-Id")
    if (!nextSessionId) {
      throw new Error("Transmission RPC session negotiation failed.")
    }

    return transmissionRpc<TArguments>(settings, method, args, fetchImpl, nextSessionId)
  }

  if (!response.ok) {
    throw new Error(`Transmission request failed with HTTP ${response.status}.`)
  }

  const payload = await response.json() as TransmissionRpcSuccess<TArguments>
  if (payload.result !== "success") {
    throw new Error(`Transmission RPC failed: ${payload.result || "unknown error"}`)
  }

  return payload
}

export async function authenticateTransmission(
  settings: AppSettings,
  fetchImpl: FetchLike = fetch
): Promise<void> {
  await transmissionRpc(settings, "session-get", {}, fetchImpl)
}
