import { getSourceAdapterById } from "../sources"
import { getSubscriptionSourceFetcherById } from "./source-fetch"
import type { SubscriptionSourceFetchFunction } from "./source-fetch/types"
import type { SourceId } from "../shared/types"
import type { SourceSubscriptionScanCandidate } from "../sources/types"
import type { SubscriptionCandidate } from "./types"

type ScanSubscriptionCandidatesFromSourceDependencies = {
  getFetcherById?: typeof getSubscriptionSourceFetcherById
  getAdapterById?: typeof getSourceAdapterById
  fetchImpl?: SubscriptionSourceFetchFunction
}

export async function scanSubscriptionCandidatesFromSource(
  sourceId: SourceId,
  dependencies: ScanSubscriptionCandidatesFromSourceDependencies = {}
): Promise<SubscriptionCandidate[]> {
  const getFetcherById = dependencies.getFetcherById ?? getSubscriptionSourceFetcherById
  const getAdapterById = dependencies.getAdapterById ?? getSourceAdapterById
  const fetcher = getFetcherById(sourceId)
  const adapter = getAdapterById(sourceId)

  if (!fetcher || !adapter) {
    return []
  }

  const rawCandidates = await fetcher.fetchCandidates(dependencies.fetchImpl ?? fetch)
  return normalizeAndDedupeCandidates(sourceId, rawCandidates, (url) => adapter.matchesDetailUrl(url))
}

function normalizeAndDedupeCandidates(
  sourceId: SourceId,
  candidates: SourceSubscriptionScanCandidate[],
  matchesDetailUrl: (url: URL) => boolean
): SubscriptionCandidate[] {
  const dedupe = new Set<string>()
  const normalized: SubscriptionCandidate[] = []

  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    if (!candidate || typeof candidate !== "object") {
      continue
    }

    const title = normalizeText(candidate.title)
    const detailUrl = normalizeUrl(candidate.detailUrl)
    const detailUrlObject = parseUrl(detailUrl)
    if (!title || !detailUrl || !detailUrlObject || !matchesDetailUrl(detailUrlObject)) {
      continue
    }

    const dedupeKey = `${sourceId}:${detailUrl}`
    if (dedupe.has(dedupeKey)) {
      continue
    }

    dedupe.add(dedupeKey)
    normalized.push({
      sourceId,
      title,
      normalizedTitle: title.toLowerCase(),
      detailUrl,
      magnetUrl: normalizeMagnetUrl(candidate.magnetUrl),
      torrentUrl: normalizeUrl(candidate.torrentUrl, detailUrl),
      subgroup: normalizeText(candidate.subgroup)
    })
  }

  return normalized
}

function normalizeText(value: string | undefined): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeMagnetUrl(value: string | undefined): string {
  const normalized = normalizeText(value)
  return /^magnet:/i.test(normalized) ? normalized : ""
}

function normalizeUrl(value: string | undefined, baseUrl?: string): string {
  const normalized = normalizeText(value)
  if (!normalized) {
    return ""
  }

  try {
    return new URL(normalized, baseUrl).href
  } catch {
    return ""
  }
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}