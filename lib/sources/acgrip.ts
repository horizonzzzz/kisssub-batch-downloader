import { normalizeTitle } from "../background/preparation"
import { DEFAULT_SOURCE_DELIVERY_MODES, getSupportedDeliveryModes } from "./delivery"
import type { BatchItem, ExtractionResult, Settings } from "../shared/types"
import { withDetailTab } from "./detail-tab"
import type { SourceAdapter } from "./types"

const DETAIL_SELECTOR = 'a[href^="/t/"], a[href*="/t/"]'

type AcgRipDetailSnapshot = {
  title: string
  torrentUrl: string
}

function matchesHost(url: URL) {
  return /(^|\.)acg\.rip$/i.test(url.hostname)
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

function extractDetailId(detailUrl: string) {
  const match = detailUrl.match(/\/t\/(\d+)$/)
  return match ? match[1].toLowerCase() : ""
}

function matchesTorrentUrl(url: URL) {
  return matchesHost(url) && /\/t\/\d+\.torrent$/i.test(url.pathname)
}

export function parseAcgRipDetailSnapshot(
  snapshot: AcgRipDetailSnapshot,
  detailUrl: string
): Omit<ExtractionResult, "detailUrl"> {
  const normalizedTorrentUrl = normalizeText(snapshot.torrentUrl)

  return {
    ok: Boolean(normalizedTorrentUrl),
    title: normalizeTitle(snapshot.title),
    hash: extractDetailId(detailUrl),
    magnetUrl: "",
    torrentUrl: normalizedTorrentUrl,
    failureReason: normalizedTorrentUrl
      ? ""
      : "The detail page finished loading, but no usable torrent URL was exposed."
  }
}

export const acgRipSourceAdapter: SourceAdapter = {
  id: "acgrip",
  displayName: "ACG.RIP",
  supportedDeliveryModes: getSupportedDeliveryModes("acgrip"),
  defaultDeliveryMode: DEFAULT_SOURCE_DELIVERY_MODES.acgrip,
  matchesListPage(url) {
    if (!matchesHost(url) || this.matchesDetailUrl(url) || matchesTorrentUrl(url)) {
      return false
    }

    return (
      url.pathname === "/" ||
      /^\/page\/\d+$/i.test(url.pathname) ||
      /^\/\d+$/i.test(url.pathname) ||
      /^\/series\/\d+$/i.test(url.pathname)
    )
  },
  matchesDetailUrl(url) {
    return matchesHost(url) && /\/t\/\d+$/i.test(url.pathname)
  },
  getDetailAnchors(root, pageUrl) {
    return Array.from(root.querySelectorAll<HTMLAnchorElement>(DETAIL_SELECTOR)).filter((anchor) => {
      try {
        return this.matchesDetailUrl(new URL(anchor.getAttribute("href") || anchor.href, pageUrl.href))
      } catch {
        return false
      }
    })
  },
  getBatchItemFromAnchor(anchor, pageUrl) {
    const detailUrl = new URL(anchor.getAttribute("href") || anchor.href, pageUrl.href).href
    const title = normalizeText(anchor.textContent)
    if (!title) {
      return null
    }

    const torrentAnchor = anchor
      .closest("tr")
      ?.querySelectorAll<HTMLAnchorElement>('a[href$=".torrent"], a[href*=".torrent"]')

    let submitUrl = ""
    for (const candidate of Array.from(torrentAnchor ?? [])) {
      try {
        const candidateUrl = new URL(candidate.getAttribute("href") || candidate.href, pageUrl.href)
        if (matchesTorrentUrl(candidateUrl)) {
          submitUrl = candidateUrl.href
          break
        }
      } catch {
        // Ignore malformed links and keep searching.
      }
    }

    const item: BatchItem = {
      sourceId: this.id,
      detailUrl,
      title
    }

    if (submitUrl) {
      item.torrentUrl = submitUrl
    }

    return item
  },
  async extractSingleItem(item, settings) {
    let lastFailure = "Unknown extraction error."

    for (let attempt = 0; attempt <= settings.retryCount; attempt += 1) {
      try {
        const snapshot = await withDetailTab(
          item.detailUrl,
          Math.max(settings.injectTimeoutMs, 10000),
          async (tabId) => executeExtraction(tabId)
        )

        return {
          ...parseAcgRipDetailSnapshot(snapshot, item.detailUrl),
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
      hash: extractDetailId(item.detailUrl),
      magnetUrl: "",
      torrentUrl: "",
      failureReason: lastFailure
    }
  }
}

async function executeExtraction(tabId: number): Promise<AcgRipDetailSnapshot> {
  const execution = await chrome.scripting.executeScript({
    target: { tabId },
    func: acgRipDetailExtractionScript
  })

  return execution[0]?.result as AcgRipDetailSnapshot
}

function acgRipDetailExtractionScript(): AcgRipDetailSnapshot {
  const title =
    document.querySelector(".post-show-content .panel-heading")?.textContent?.trim() ||
    document.querySelector(".breadcrumb li:last-child, .breadcrumb li:last-of-type")?.textContent?.trim() ||
    document.querySelector("h1, .post-title, .panel-title")?.textContent?.trim() ||
    document.title.replace(/\s*-\s*ACG\.RIP\s*$/i, "").trim()

  const torrentUrl =
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href$=".torrent"], a[href*=".torrent"]'))
      .map((anchor) => anchor.href || anchor.getAttribute("href") || "")
      .find((href) => /\/t\/\d+\.torrent$/i.test(href)) || ""

  return {
    title,
    torrentUrl
  }
}
