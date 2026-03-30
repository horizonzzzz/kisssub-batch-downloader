import { extractMagnetHash, normalizeTitle } from "../background/preparation"
import { DEFAULT_SOURCE_DELIVERY_MODES, getSupportedDeliveryModes } from "./delivery"
import type { BatchItem, ExtractionResult, Settings } from "../shared/types"
import { withDetailTab } from "./detail-tab"
import type { SourceAdapter } from "./types"

const ENTRY_SELECTOR = 'a[href*="/detail/"][href$=".html"]'

type DongmanhuayuanDetailSnapshot = {
  title: string
  magnetCandidates: string[]
}

function matchesHost(url: URL) {
  return /(^|\.)dongmanhuayuan\.com$/i.test(url.hostname)
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

function extractDetailId(detailUrl: string): string {
  const match = detailUrl.match(/\/detail\/([A-Za-z0-9]+)\.html$/)
  return match ? match[1].toLowerCase() : ""
}

export function parseDongmanhuayuanDetailSnapshot(
  snapshot: DongmanhuayuanDetailSnapshot,
  detailUrl: string
): Omit<ExtractionResult, "detailUrl"> {
  const magnetUrl =
    snapshot.magnetCandidates.find((candidate) => /^magnet:\?xt=urn:btih:/i.test(candidate)) || ""

  return {
    ok: Boolean(magnetUrl),
    title: normalizeTitle(snapshot.title),
    hash: extractMagnetHash(magnetUrl) || extractDetailId(detailUrl),
    magnetUrl,
    torrentUrl: "",
    failureReason: magnetUrl
      ? ""
      : "The detail page finished loading, but no usable magnet URL was exposed."
  }
}

export const dongmanhuayuanSourceAdapter: SourceAdapter = {
  id: "dongmanhuayuan",
  displayName: "动漫花园",
  supportedDeliveryModes: getSupportedDeliveryModes("dongmanhuayuan"),
  defaultDeliveryMode: DEFAULT_SOURCE_DELIVERY_MODES.dongmanhuayuan,
  matchesListPage(url) {
    return matchesHost(url) && !this.matchesDetailUrl(url)
  },
  matchesDetailUrl(url) {
    return matchesHost(url) && /\/detail\/[A-Za-z0-9]+\.html$/i.test(url.pathname)
  },
  getDetailAnchors(root, pageUrl) {
    return Array.from(root.querySelectorAll<HTMLAnchorElement>(ENTRY_SELECTOR)).filter((anchor) => {
      try {
        return this.matchesDetailUrl(new URL(anchor.getAttribute("href") || anchor.href, pageUrl.href))
      } catch {
        return false
      }
    })
  },
  getBatchItemFromAnchor(anchor, pageUrl) {
    const title = normalizeText(anchor.textContent)
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
          async (tabId) => executeExtraction(tabId)
        )

        return {
          ...parseDongmanhuayuanDetailSnapshot(snapshot, item.detailUrl),
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

async function executeExtraction(tabId: number): Promise<DongmanhuayuanDetailSnapshot> {
  const execution = await chrome.scripting.executeScript({
    target: { tabId },
    func: dongmanhuayuanDetailExtractionScript
  })

  return execution[0]?.result as DongmanhuayuanDetailSnapshot
}

function dongmanhuayuanDetailExtractionScript(): DongmanhuayuanDetailSnapshot {
  const textInputs = Array.from(document.querySelectorAll<HTMLInputElement>("input"))
    .map((input) => input.value.trim())
    .filter(Boolean)

  const textareas = Array.from(document.querySelectorAll<HTMLTextAreaElement>("textarea"))
    .map((textarea) => textarea.value.trim())
    .filter(Boolean)

  const mainElement = document.querySelector("main")
  const resourceTitle = mainElement
    ? mainElement.querySelector("h1")?.textContent?.trim()
    : null
  const fallbackTitle = document.title.replace(/_动漫花园.*$/u, "").trim()

  return {
    title: resourceTitle || fallbackTitle,
    magnetCandidates: [...textInputs, ...textareas]
  }
}
