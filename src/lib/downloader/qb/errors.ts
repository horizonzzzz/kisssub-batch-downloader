import type { AppSettings } from "../../shared/types"

export function getQbLoginErrorMessage(
  status: number,
  settings: Pick<AppSettings, "downloaders">
): string {
  const baseUrl = settings.downloaders.qbittorrent.baseUrl
  if (status === 401) {
    return [
      `qBittorrent login failed with HTTP 401 at ${baseUrl}.`,
      "First confirm the WebUI username and password are correct.",
      "If this WebUI is only used locally from a browser extension, disable `Enable Cross-Site Request Forgery (CSRF) protection` in qBittorrent WebUI settings and test again.",
      "If it still fails, disable `Host header validation` and test again."
    ].join(" ")
  }

  return `qBittorrent login failed with HTTP ${status}.`
}
