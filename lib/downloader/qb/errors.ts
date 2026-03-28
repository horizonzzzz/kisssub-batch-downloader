import type { Settings } from "../../shared/types"

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
