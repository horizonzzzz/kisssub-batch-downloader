import { normalizeTitle } from "../background/preparation"
import { DEFAULT_SOURCE_DELIVERY_MODES, getSupportedDeliveryModes } from "./delivery"
import { matchesSourceHost } from "./matching"
import type { BatchItem, ExtractionResult, Settings } from "../shared/types"
import { withDetailTab } from "./detail-tab"
import type { SourceAdapter } from "./types"

const ENTRY_SELECTOR = 'a[href^="/torrent/"][target="_blank"], a[href*="/torrent/"][target="_blank"]'

type BangumiMoeDetailSnapshot = {
  title: string
  torrentId: string
  magnetUrl: string
  torrentDownloadUrl: string
}

type BangumiMoeTorrentScope = {
  _id?: string
  title?: string
}

function matchesHost(url: URL) {
  return matchesSourceHost("bangumimoe", url)
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

function extractTorrentId(detailUrl: string) {
  const match = detailUrl.match(/\/torrent\/([a-f0-9]+)$/i)
  return match ? match[1].toLowerCase() : ""
}

function getTitleFromAnchor(anchor: HTMLAnchorElement) {
  const titleNode =
    anchor.closest("h3")?.querySelector("span") ||
    anchor.closest(".torrent-title")?.querySelector("h3 .ng-binding, h3 span, h3") ||
    anchor.closest(".md-tile-content")?.querySelector(".torrent-title h3 .ng-binding, .torrent-title h3 span, .torrent-title h3")

  return normalizeText(titleNode?.textContent)
}

export function parseBangumiMoeDetailSnapshot(
  snapshot: BangumiMoeDetailSnapshot,
  detailUrl: string
): Omit<ExtractionResult, "detailUrl"> {
  const magnetUrl = normalizeText(snapshot.magnetUrl)
  const torrentUrl = normalizeText(snapshot.torrentDownloadUrl)

  return {
    ok: Boolean(magnetUrl || torrentUrl),
    title: normalizeTitle(snapshot.title),
    hash: normalizeText(snapshot.torrentId).toLowerCase() || extractTorrentId(detailUrl),
    magnetUrl,
    torrentUrl,
    failureReason:
      magnetUrl || torrentUrl
        ? ""
        : "The detail page finished loading, but no usable magnet or torrent URL was exposed."
  }
}

export const bangumiMoeSourceAdapter: SourceAdapter = {
  id: "bangumimoe",
  displayName: "Bangumi.moe",
  supportedDeliveryModes: getSupportedDeliveryModes("bangumimoe"),
  defaultDeliveryMode: DEFAULT_SOURCE_DELIVERY_MODES.bangumimoe,
  matchesListPage(url) {
    if (!matchesHost(url) || this.matchesDetailUrl(url)) {
      return false
    }

    return url.pathname === "/" || /^\/search(?:\/.*)?$/i.test(url.pathname)
  },
  matchesDetailUrl(url) {
    return matchesHost(url) && /\/torrent\/[a-f0-9]+$/i.test(url.pathname)
  },
  getDetailAnchors(root, pageUrl) {
    return Array.from(root.querySelectorAll<HTMLAnchorElement>(ENTRY_SELECTOR)).filter((anchor) => {
      try {
        const detailUrl = new URL(anchor.getAttribute("href") || anchor.href, pageUrl.href)
        return this.matchesDetailUrl(detailUrl) && Boolean(getTitleFromAnchor(anchor))
      } catch {
        return false
      }
    })
  },
  getBatchItemFromAnchor(anchor, pageUrl) {
    const title = getTitleFromAnchor(anchor)
    if (!title) {
      return null
    }

    return {
      sourceId: this.id,
      detailUrl: new URL(anchor.getAttribute("href") || anchor.href, pageUrl.href).href,
      title
    }
  },
  async extractSingleItem(item, settings) {
    let lastFailure = "Unknown extraction error."

    for (let attempt = 0; attempt <= settings.retryCount; attempt += 1) {
      try {
        const snapshot = await withDetailTab(
          item.detailUrl,
          Math.max(settings.injectTimeoutMs, 10000),
          async (tabId) => executeExtraction(tabId, settings.domSettleMs)
        )

        return {
          ...parseBangumiMoeDetailSnapshot(snapshot, item.detailUrl),
          detailUrl: item.detailUrl
        }
      } catch (error: unknown) {
        lastFailure = error instanceof Error ? error.message : String(error)
      }
    }

    return {
      ok: false,
      title: item.title,
      detailUrl: item.detailUrl,
      hash: extractTorrentId(item.detailUrl),
      magnetUrl: "",
      torrentUrl: "",
      failureReason: lastFailure
    }
  }
}

async function executeExtraction(tabId: number, domSettleMs: number): Promise<BangumiMoeDetailSnapshot> {
  const execution = await chrome.scripting.executeScript({
    target: { tabId },
    func: bangumiMoeDetailExtractionScript,
    args: [domSettleMs]
  })

  return execution[0]?.result as BangumiMoeDetailSnapshot
}

function bangumiMoeDetailExtractionScript(domSettleMs: number): Promise<BangumiMoeDetailSnapshot> {
  const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

  const normalize = (value: string | null | undefined) =>
    String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()

  const extractTorrentIdFromLocation = () => {
    const match = window.location.pathname.match(/\/torrent\/([a-f0-9]+)$/i)
    return match ? match[1].toLowerCase() : ""
  }

  const getTorrentScope = (): BangumiMoeTorrentScope | null => {
    const angularValue = (
      window as Window & {
        angular?: {
          element?: (node: Element | null) => {
            scope?: () => {
              torrent?: BangumiMoeTorrentScope
            }
          }
        }
      }
    ).angular

    const dialog = document.querySelector("md-dialog")
    const scope = angularValue?.element?.(dialog).scope?.()
    return scope?.torrent ?? null
  }

  const getTitle = () => {
    return normalize(
      document.querySelector("md-dialog .title-link")?.textContent ||
        document.querySelector("md-dialog .torrent-details-div h3 span")?.textContent ||
        document.title.replace(/\s*-\s*Torrent\s*-\s*萌番组\s*$/u, "").trim()
    )
  }

  const getMagnetUrl = () => {
    return (
      Array.from(document.querySelectorAll<HTMLAnchorElement>('md-dialog a[href^="magnet:"]'))
        .map((anchor) => anchor.href || anchor.getAttribute("href") || "")
        .find((href) => /^magnet:/i.test(href)) || ""
    )
  }

  const getTorrentDownloadUrl = () => {
    const torrent = getTorrentScope()
    const torrentId = normalize(torrent?._id) || extractTorrentIdFromLocation()
    const torrentTitle = normalize(torrent?.title) || getTitle()

    if (!torrentId || !torrentTitle) {
      return ""
    }

    return new URL(
      `/download/torrent/${torrentId}/${encodeURIComponent(torrentTitle)}.torrent`,
      window.location.origin
    ).href
  }

  return (async () => {
    const deadline = Date.now() + Math.max(domSettleMs, 1500)

    while (Date.now() < deadline) {
      if (document.querySelector("md-dialog.torrent-details-dialog")) {
        break
      }

      await sleep(100)
    }

    const torrent = getTorrentScope()

    return {
      title: normalize(torrent?.title) || getTitle(),
      torrentId: normalize(torrent?._id) || extractTorrentIdFromLocation(),
      magnetUrl: getMagnetUrl(),
      torrentDownloadUrl: getTorrentDownloadUrl()
    }
  })()
}
