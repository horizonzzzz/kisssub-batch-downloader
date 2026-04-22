import { extractDetailHash, normalizeTitle } from "../download-preparation"
import { getBrowser } from "../shared/browser"
import { DEFAULT_SOURCE_DELIVERY_MODES, getSupportedDeliveryModes } from "./delivery"
import { matchesSourceHost } from "./matching"
import type { BatchItem, ExtractionResult } from "../shared/types"
import { withDetailTab } from "./detail-tab"
import type { ExtractionContext, SourceAdapter } from "./types"

const ENTRY_SELECTOR = 'a[href*="show-"][href$=".html"]'
const MAIN_EXECUTION_WORLD = "MAIN" as const
const KISSSUB_FIELD_FAILURE =
  "The Kisssub detail page no longer exposes the fields required to build download links."
const KISSSUB_TORRENT_BASE_URL = "//v2.uploadbt.com/"
const KISSSUB_FALLBACK_TORRENT_FORMAT = "[kisssub.org]%s"

type KisssubDetailSnapshot = {
  title: string
  hash: string
  magnetUrl: string
  torrentUrl: string
  magnetLabel: string
  downloadLabel: string
}

type KisssubConfigSnapshot = {
  in_script?: unknown
  hash_id?: unknown
  bt_data_title?: unknown
  announce?: unknown
  down_torrent_format?: unknown
}

type KisssubBuiltLinks = {
  hash: string
  magnetUrl: string
  torrentUrl: string
}

function matchesHost(url: URL) {
  return matchesSourceHost("kisssub", url)
}

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

export function buildKisssubLinksFromConfig(
  config: KisssubConfigSnapshot | null | undefined,
  detailUrl: string
): KisssubBuiltLinks | null {
  if (!config || config.in_script !== "show") {
    return null
  }

  const hash = normalizeText(String(config.hash_id ?? ""))
  const title = normalizeText(String(config.bt_data_title ?? ""))

  if (!hash || !/^[a-f0-9]+$/i.test(hash) || !title) {
    return null
  }

  const announce = normalizeText(String(config.announce ?? ""))
  const torrentFormat = normalizeText(String(config.down_torrent_format ?? ""))
  const effectiveFormat = torrentFormat.includes("%s")
    ? torrentFormat
    : KISSSUB_FALLBACK_TORRENT_FORMAT
  const formattedTitle = effectiveFormat.replace("%s", title)
  const magnetUrl = announce
    ? `magnet:?xt=urn:btih:${hash.toLowerCase()}&tr=${announce}`
    : `magnet:?xt=urn:btih:${hash.toLowerCase()}`
  const torrentUrl = new URL(
    `?r=down&hash=${encodeURIComponent(hash.toLowerCase())}&name=${encodeURIComponent(formattedTitle)}`,
    new URL(KISSSUB_TORRENT_BASE_URL, detailUrl)
  ).href

  return {
    hash: hash.toLowerCase(),
    magnetUrl,
    torrentUrl
  }
}

function buildExtractionResult(item: BatchItem, snapshot: KisssubDetailSnapshot): ExtractionResult {
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
  async extractSingleItem(item, context) {
    let lastFailure = "Unknown extraction error."

    for (let attempt = 0; attempt <= context.execution.retryCount; attempt += 1) {
      try {
        const timeoutMs = Math.max(context.execution.injectTimeoutMs, 10000)
        return await withDetailTab(
          item.detailUrl,
          timeoutMs,
          async (tabId) => buildExtractionResult(item, await executeExtraction(tabId, context, item.detailUrl))
        )
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

  return {
    ok: Boolean(magnetUrl || torrentUrl),
    title: normalizeTitle(snapshot.title),
    hash: normalizeText(snapshot.hash),
    magnetUrl,
    torrentUrl,
    failureReason: magnetUrl || torrentUrl ? "" : KISSSUB_FIELD_FAILURE
  }
}

async function executeExtraction(
  tabId: number,
  context: ExtractionContext,
  detailUrl: string
) {
  const execution = await getBrowser().scripting.executeScript({
    target: { tabId },
    world: MAIN_EXECUTION_WORLD,
    func: kisssubDetailExtractionScript,
    args: [
      {
        detailUrl,
        domSettleMs: context.execution.domSettleMs
      }
    ]
  })

  return execution[0]?.result as KisssubDetailSnapshot
}

function kisssubDetailExtractionScript(config: {
  detailUrl: string
  domSettleMs: number
}) {
  const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

  const normalizeTextInPage = (value: unknown): string =>
    String(value ?? "")
      .replace(/\s+/g, " ")
      .trim()

  const getTitle = () => {
    const headingTitle =
      document.querySelector("div.navigation a:last-of-type")?.textContent?.trim() ||
      document.querySelector("h1, .entry-title, .post-title")?.textContent?.trim()

    if (headingTitle) {
      return headingTitle
    }

    return document.title.replace(/\s*-\s*爱恋动漫.*$/u, "").trim()
  }

  const getHashFromUrl = () => {
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

  const buildFromConfig = () => {
    const configObject = (window as unknown as { Config?: Record<string, unknown> }).Config
    if (!configObject || configObject.in_script !== "show") {
      return null
    }

    const hash = normalizeTextInPage(configObject.hash_id)
    const title = normalizeTextInPage(configObject.bt_data_title)
    if (!hash || !/^[a-f0-9]+$/i.test(hash) || !title) {
      return null
    }

    const announce = normalizeTextInPage(configObject.announce)
    const rawFormat = normalizeTextInPage(configObject.down_torrent_format)
    const format = rawFormat.includes("%s") ? rawFormat : "[kisssub.org]%s"
    const formattedTitle = format.replace("%s", title)
    const magnetUrl = announce
      ? `magnet:?xt=urn:btih:${hash.toLowerCase()}&tr=${announce}`
      : `magnet:?xt=urn:btih:${hash.toLowerCase()}`
    const torrentUrl = new URL(
      `?r=down&hash=${encodeURIComponent(hash.toLowerCase())}&name=${encodeURIComponent(formattedTitle)}`,
      new URL("//v2.uploadbt.com/", config.detailUrl)
    ).href

    return {
      hash: hash.toLowerCase(),
      magnetUrl,
      torrentUrl
    }
  }

  const summarize = (): KisssubDetailSnapshot => {
    const magnet = getAnchorInfo("magnet")
    const download = getAnchorInfo("download")
    const magnetUrl = magnet && /^magnet:/i.test(magnet.absoluteHref) ? magnet.absoluteHref : ""
    const torrentUrl = download && download.absoluteHref && !looksLikeWormhole(download) ? download.absoluteHref : ""
    const magnetNeedsConfig = !magnetUrl && magnet && looksLikeWormhole(magnet)
    const torrentNeedsConfig = !torrentUrl && download && looksLikeWormhole(download)
    const builtLinks = magnetNeedsConfig || torrentNeedsConfig ? buildFromConfig() : null

    return {
      title: getTitle(),
      hash: builtLinks?.hash || getHashFromUrl(),
      magnetUrl: magnetUrl || builtLinks?.magnetUrl || "",
      torrentUrl: torrentUrl || builtLinks?.torrentUrl || "",
      magnetLabel: magnet ? magnet.text : "",
      downloadLabel: download ? download.text : ""
    }
  }

  return (async () => {
    if (config.domSettleMs > 0) {
      await sleep(config.domSettleMs)
    }

    return summarize()
  })()
}
