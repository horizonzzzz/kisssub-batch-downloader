import type { SourceSubscriptionScanCandidate } from "../../sources/types"
import type { SubscriptionSourceFetchFunction, SubscriptionSourceFetcher } from "./types"

const ACG_RIP_LIST_URL = "https://acg.rip/"
const DETAIL_PATTERN = /href="([^"]*\/t\/\d+)"[^>]*>([^<]+)</giu
const TORRENT_PATTERN = /href="([^"]*\/t\/\d+\.torrent)"/giu
const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  "#39": "'"
}

function normalize(value: string | null | undefined) {
  return decodeHtmlEntities(String(value ?? ""))
    .replace(/\s+/g, " ")
    .trim()
}

function absolutize(path: string) {
  return new URL(path, ACG_RIP_LIST_URL).href
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

export async function fetchAcgRipSubscriptionCandidates(
  fetchImpl: SubscriptionSourceFetchFunction = fetch
): Promise<SourceSubscriptionScanCandidate[]> {
  const response = await fetchImpl(ACG_RIP_LIST_URL)
  if (!response.ok) {
    throw new Error(`ACG.RIP subscription fetch failed: ${response.status}`)
  }

  const html = await response.text()
  const rows = html.match(/<tr\b[\s\S]*?<\/tr>/giu) ?? []

  return rows.flatMap((row) => {
    // Extract detail URL and title from the same anchor
    const detailMatches = row.matchAll(DETAIL_PATTERN)
    const results: SourceSubscriptionScanCandidate[] = []

    for (const detailMatch of detailMatches) {
      const detailUrl = detailMatch[1]
      const title = normalize(detailMatch[2])

      if (!detailUrl || !title) {
        continue
      }

      // Extract torrent URL from the same row
      const torrentMatch = TORRENT_PATTERN.exec(row)
      TORRENT_PATTERN.lastIndex = 0

      results.push({
        sourceId: "acgrip",
        title,
        detailUrl: absolutize(detailUrl),
        magnetUrl: "",
        torrentUrl: torrentMatch?.[1] ? absolutize(torrentMatch[1]) : "",
        subgroup: ""
      })
    }

    return results
  })
}

export const acgRipSubscriptionSourceFetcher: SubscriptionSourceFetcher = {
  sourceId: "acgrip",
  fetchCandidates(fetchImpl) {
    return fetchAcgRipSubscriptionCandidates(fetchImpl)
  }
}
