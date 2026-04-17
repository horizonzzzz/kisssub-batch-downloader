import { getBrowser } from "../shared/browser"
import { DEFAULT_SOURCE_DELIVERY_MODES, getSupportedDeliveryModes } from "./delivery"
import { matchesSourceHost } from "./matching"
import type { AppSettings, BatchItem, ExtractionResult } from "../shared/types"
import { withDetailTab } from "./detail-tab"
import type { SourceAdapter, SourceSubscriptionScanCandidate } from "./types"

const DETAIL_SELECTOR = 'a[href^="/t/"], a[href*="/t/"]'
const LIST_SCAN_ROW_SELECTOR = "table tr"

type AcgRipDetailSnapshot = {
  title: string
  torrentUrl: string
}

function matchesHost(url: URL) {
  return matchesSourceHost("acgrip", url)
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
    title: normalizeText(snapshot.title),
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
  subscriptionListScan: {
    listPageUrl: "https://acg.rip/",
    fetchCandidates: (tabId) => executeListScan(tabId)
  },
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
  const execution = await getBrowser().scripting.executeScript({
    target: { tabId },
    func: acgRipDetailExtractionScript
  })

  return execution[0]?.result as AcgRipDetailSnapshot
}

async function executeListScan(tabId: number): Promise<SourceSubscriptionScanCandidate[]> {
  const execution = await getBrowser().scripting.executeScript({
    target: { tabId },
    func: acgRipListScanScript
  })

  return (execution[0]?.result as SourceSubscriptionScanCandidate[] | undefined) ?? []
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

function acgRipListScanScript(): SourceSubscriptionScanCandidate[] {
  const normalize = (value: string | null | undefined) =>
    String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()

  const resolveUrl = (value: string) => {
    try {
      return new URL(value, window.location.href).href
    } catch {
      return ""
    }
  }

  const matchesDetailPath = (value: string) => /\/t\/\d+$/i.test(value)
  const matchesTorrentPath = (value: string) => /\/t\/\d+\.torrent$/i.test(value)

  const candidates: SourceSubscriptionScanCandidate[] = []

  const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>(LIST_SCAN_ROW_SELECTOR))
  for (const row of rows) {
    const detailAnchor = Array.from(
      row.querySelectorAll<HTMLAnchorElement>('a[href^="/t/"], a[href*="/t/"]')
    ).find((anchor) => {
      const detailUrl = resolveUrl(anchor.getAttribute("href") || anchor.href)
      if (!detailUrl) {
        return false
      }

      try {
        return matchesDetailPath(new URL(detailUrl).pathname)
      } catch {
        return false
      }
    })

    if (!detailAnchor) {
      continue
    }

    const detailUrl = resolveUrl(detailAnchor.getAttribute("href") || detailAnchor.href)
    if (!detailUrl) {
      continue
    }

    const title = normalize(detailAnchor.textContent)
    if (!title) {
      continue
    }

    let torrentUrl = ""
    const torrentAnchors = row.querySelectorAll<HTMLAnchorElement>('a[href$=".torrent"], a[href*=".torrent"]')

    for (const candidate of Array.from(torrentAnchors ?? [])) {
      const candidateUrl = resolveUrl(candidate.getAttribute("href") || candidate.href)
      if (!candidateUrl) {
        continue
      }

      try {
        if (matchesTorrentPath(new URL(candidateUrl).pathname)) {
          torrentUrl = candidateUrl
          break
        }
      } catch {
        // Ignore malformed torrent urls and keep searching.
      }
    }

    candidates.push({
      sourceId: "acgrip",
      title,
      detailUrl,
      magnetUrl: "",
      torrentUrl,
      subgroup: ""
    })
  }

  return candidates
}
