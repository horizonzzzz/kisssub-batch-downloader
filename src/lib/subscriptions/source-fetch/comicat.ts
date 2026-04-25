import type { SourceSubscriptionScanCandidate } from "../../sources/types"
import type { SubscriptionSourceFetchFunction, SubscriptionSourceFetcher } from "./types"

const COMICAT_RSS_URL = "http://www.comicat.org/rss.xml"
const ITEM_PATTERN = /<item\b[\s\S]*?<\/item>/giu
const HTML_TAG_PATTERN = /<[^>]+>/g
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  "#39": "'"
}

function extractDetailHash(detailUrl: string) {
  const match = detailUrl.match(/show-([a-f0-9]{40})\.html/i)
  return match ? match[1].toLowerCase() : ""
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/giu, (entity, token: string) => {
    const normalizedToken = token.toLowerCase()
    const namedEntity = NAMED_HTML_ENTITIES[normalizedToken]
    if (namedEntity) {
      return namedEntity
    }

    if (normalizedToken.startsWith("#x")) {
      const codePoint = Number.parseInt(normalizedToken.slice(2), 16)
      return Number.isNaN(codePoint) ? entity : String.fromCodePoint(codePoint)
    }

    if (normalizedToken.startsWith("#")) {
      const codePoint = Number.parseInt(normalizedToken.slice(1), 10)
      return Number.isNaN(codePoint) ? entity : String.fromCodePoint(codePoint)
    }

    return entity
  })
}

function normalize(value: string | null | undefined) {
  return decodeHtmlEntities(String(value ?? ""))
    .replace(HTML_TAG_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractTagValue(item: string, tagName: string): string {
  const cdata = item.match(new RegExp(`<${tagName}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tagName}>`, "iu"))
  if (cdata?.[1]) {
    return normalize(cdata[1])
  }

  const plain = item.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "iu"))
  return normalize(plain?.[1] ?? "")
}

export async function fetchComicatSubscriptionCandidates(
  fetchImpl: SubscriptionSourceFetchFunction = fetch
): Promise<SourceSubscriptionScanCandidate[]> {
  const response = await fetchImpl(COMICAT_RSS_URL)
  if (!response.ok) {
    throw new Error(`Comicat subscription fetch failed: ${response.status}`)
  }

  const xml = await response.text()
  const items = Array.from(xml.matchAll(ITEM_PATTERN))

  return items.flatMap((itemMatch) => {
    const item = itemMatch[0]
    const title = extractTagValue(item, "title")
    const detailUrl = extractTagValue(item, "link")
    const hash = extractDetailHash(detailUrl)
    if (!title || !detailUrl || !hash) {
      return []
    }

    return [{
      sourceId: "comicat",
      title,
      detailUrl,
      magnetUrl: `magnet:?xt=urn:btih:${hash}`,
      torrentUrl: "",
      subgroup: ""
    }]
  })
}

export const comicatSubscriptionSourceFetcher: SubscriptionSourceFetcher = {
  sourceId: "comicat",
  fetchCandidates(fetchImpl) {
    return fetchComicatSubscriptionCandidates(fetchImpl)
  }
}