import { extractDetailHash, normalizeTitle } from "../background/preparation"
import { getBrowser } from "../shared/browser"
import { DEFAULT_SOURCE_DELIVERY_MODES, getSupportedDeliveryModes } from "./delivery"
import { matchesSourceHost } from "./matching"
import type { BatchItem, ExtractionResult, Settings } from "../shared/types"
import { withDetailTab } from "./detail-tab"
import type { SourceAdapter } from "./types"

const ENTRY_SELECTOR = 'a[href*="show-"][href$=".html"]'

type KisssubDetailSnapshot = {
  title: string
  hash: string
  magnetUrl: string
  torrentUrl: string
  magnetLabel: string
  downloadLabel: string
}

function matchesHost(url: URL) {
  return matchesSourceHost("kisssub", url)
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

export const kisssubSourceAdapter: SourceAdapter = {
  id: "kisssub",
  displayName: "Kisssub",
  supportedDeliveryModes: getSupportedDeliveryModes("kisssub"),
  defaultDeliveryMode: DEFAULT_SOURCE_DELIVERY_MODES.kisssub,
  matchesListPage(url) {
    if (!matchesHost(url)) {
      return false
    }

    if (this.matchesDetailUrl(url)) {
      return false
    }

    return !/\/addon\.php/i.test(url.pathname) && !/\/user\.php/i.test(url.pathname)
  },
  matchesDetailUrl(url) {
    return matchesHost(url) && /\/show-[a-f0-9]+\.html$/i.test(url.pathname)
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
          async (tabId) => executeExtraction(tabId, settings)
        )
        const extraction = parseKisssubDetailSnapshot(snapshot)

        return {
          ok: extraction.ok,
          title: normalizeTitle(extraction.title || item.title),
          detailUrl: item.detailUrl,
          hash: extraction.hash || extractDetailHash(item.detailUrl),
          magnetUrl: extraction.magnetUrl || "",
          torrentUrl: extraction.torrentUrl || "",
          failureReason: extraction.failureReason || ""
        }
      } catch (error: unknown) {
        lastFailure = error instanceof Error ? error.message : String(error)
      }
    }

    return {
      ok: false,
      title: item.title,
      detailUrl: item.detailUrl,
      hash: extractDetailHash(item.detailUrl),
      magnetUrl: "",
      torrentUrl: "",
      failureReason: lastFailure
    }
  }
}

export function parseKisssubDetailSnapshot(
  snapshot: KisssubDetailSnapshot
): Omit<ExtractionResult, "detailUrl"> {
  const magnetUrl = normalizeText(snapshot.magnetUrl)
  const torrentUrl = normalizeText(snapshot.torrentUrl)
  const helperStillRequired = snapshot.magnetLabel === "开启虫洞" || snapshot.downloadLabel === "开启虫洞"

  return {
    ok: Boolean(magnetUrl || torrentUrl),
    title: normalizeTitle(snapshot.title),
    hash: normalizeText(snapshot.hash),
    magnetUrl,
    torrentUrl,
    failureReason:
      magnetUrl || torrentUrl
        ? ""
        : helperStillRequired
          ? "The helper script timed out and the detail buttons still point to the wormhole page."
          : "The detail page finished loading, but no usable magnet or torrent URL was exposed."
  }
}

async function executeExtraction(tabId: number, settings: Settings) {
  const execution = await getBrowser().scripting.executeScript({
    target: { tabId },
    func: kisssubDetailExtractionScript,
    args: [
      {
        remoteScriptUrl: settings.remoteScriptUrl,
        remoteScriptRevision: settings.remoteScriptRevision,
        injectTimeoutMs: settings.injectTimeoutMs,
        domSettleMs: settings.domSettleMs
      }
    ]
  })

  return execution[0]?.result as KisssubDetailSnapshot
}

function kisssubDetailExtractionScript(config: {
  remoteScriptUrl: string
  remoteScriptRevision: string
  injectTimeoutMs: number
  domSettleMs: number
}) {
  const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

  const getTitle = () => {
    const headingTitle =
      document.querySelector("div.navigation a:last-of-type")?.textContent?.trim() ||
      document.querySelector("h1, .entry-title, .post-title")?.textContent?.trim()

    if (headingTitle) {
      return headingTitle
    }

    return document.title.replace(/\s*-\s*爱恋动漫.*$/u, "").trim()
  }

  const getHash = () => {
    const fromUrl = window.location.pathname.match(/show-([a-f0-9]+)\.html/i)
    return fromUrl ? fromUrl[1].toLowerCase() : ""
  }

  const getAnchorInfo = (id: string) => {
    const node = document.getElementById(id) as HTMLAnchorElement | null
    if (!node) {
      return null
    }

    return {
      id,
      text: (node.textContent || "").trim(),
      href: node.getAttribute("href") || "",
      absoluteHref: node.href || ""
    }
  }

  const looksLikeWormhole = (anchor: ReturnType<typeof getAnchorInfo>) => {
    if (!anchor) {
      return true
    }

    return /mika-mode/i.test(anchor.absoluteHref) || anchor.text === "开启虫洞"
  }

  const summarize = (): KisssubDetailSnapshot => {
    const magnet = getAnchorInfo("magnet")
    const download = getAnchorInfo("download")
    const magnetUrl = magnet && /^magnet:/i.test(magnet.absoluteHref) ? magnet.absoluteHref : ""
    const torrentUrl = download && download.absoluteHref && !looksLikeWormhole(download) ? download.absoluteHref : ""

    return {
      title: getTitle(),
      hash: getHash(),
      magnetUrl,
      torrentUrl,
      magnetLabel: magnet ? magnet.text : "",
      downloadLabel: download ? download.text : ""
    }
  }

  const setCookies = () => {
    const ttl = 60 * 60 * 24 * 365 * 10
    document.cookie = `user_script_url=${encodeURIComponent(config.remoteScriptUrl)}; max-age=${ttl}; path=/`
    document.cookie = `user_script_rev=${encodeURIComponent(config.remoteScriptRevision)}; max-age=${ttl}; path=/`
  }

  const injectHelper = () => {
    const existing = Array.from(document.scripts).find((script) =>
      (script.src || "").includes("1.acgscript.com/script/miobt/4.js")
    )

    if (existing) {
      return
    }

    const script = document.createElement("script")
    script.src = config.remoteScriptUrl
    script.async = true
    script.dataset.kisssubBatch = "remote-helper"
    document.head.appendChild(script)
  }

  return (async () => {
    const initial = summarize()
    if (initial.magnetUrl || initial.torrentUrl) {
      return initial
    }

    setCookies()
    injectHelper()

    const deadline = Date.now() + config.injectTimeoutMs
    while (Date.now() < deadline) {
      const current = summarize()
      if (current.magnetUrl || current.torrentUrl) {
        await sleep(config.domSettleMs)
        return summarize()
      }

      await sleep(250)
    }

    return summarize()
  })()
}
