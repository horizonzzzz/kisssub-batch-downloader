import { getSourceAdapterById } from "./sources"
import type { BatchItem, BatchStats, ClassifiedBatchResult, ExtractionResult } from "./types"

export function normalizeBatchItems(items: unknown): BatchItem[] {
  const seen = new Set<string>()
  const normalized: BatchItem[] = []

  for (const item of Array.isArray(items) ? items : []) {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as BatchItem).sourceId !== "string" ||
      typeof (item as BatchItem).detailUrl !== "string"
    ) {
      continue
    }

    const adapter = getSourceAdapterById((item as BatchItem).sourceId)
    if (!adapter) {
      continue
    }

    let url: URL
    try {
      url = new URL((item as BatchItem).detailUrl)
    } catch {
      continue
    }

    if (!adapter.matchesDetailUrl(url)) {
      continue
    }

    const detailUrl = url.href
    const dedupeKey = `${adapter.id}:${detailUrl}`
    if (seen.has(dedupeKey)) {
      continue
    }

    seen.add(dedupeKey)
    normalized.push({
      sourceId: adapter.id,
      detailUrl,
      title: normalizeTitle((item as BatchItem).title) || detailUrl
    })
  }

  return normalized
}

export function isKisssubDetailUrl(url: URL): boolean {
  return /(^|\.)kisssub\.org$/i.test(url.hostname) && /\/show-[a-f0-9]+\.html$/i.test(url.pathname)
}

export function normalizeTitle(title: unknown): string {
  return String(title ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

export function createStats(total: number): BatchStats {
  return {
    total,
    processed: 0,
    prepared: 0,
    submitted: 0,
    duplicated: 0,
    failed: 0
  }
}

export function classifyExtractionResult(
  result: ExtractionResult,
  seenHashes: Set<string>,
  seenUrls: Set<string>
): ClassifiedBatchResult {
  const classified: ClassifiedBatchResult = {
    ...result,
    hash: result.hash || "",
    magnetUrl: result.magnetUrl || "",
    torrentUrl: result.torrentUrl || "",
    failureReason: result.failureReason || "",
    status: "failed",
    submitKind: "",
    submitUrl: "",
    message: ""
  }

  if (!result.ok) {
    classified.message = result.failureReason || "No download link could be extracted from the detail page."
    return classified
  }

  const magnetHash = extractMagnetHash(result.magnetUrl)
  const normalizedTorrentUrl = normalizeComparableUrl(result.torrentUrl)

  if (magnetHash && seenHashes.has(magnetHash)) {
    classified.status = "duplicate"
    classified.message = `Duplicate magnet hash skipped: ${magnetHash}`
    return classified
  }

  if (normalizedTorrentUrl && seenUrls.has(normalizedTorrentUrl)) {
    classified.status = "duplicate"
    classified.message = "Duplicate torrent URL skipped."
    return classified
  }

  if (result.magnetUrl) {
    classified.status = "ready"
    classified.submitKind = "magnet"
    classified.submitUrl = result.magnetUrl
    classified.message = "Magnet resolved and queued for submission."
    if (magnetHash) {
      seenHashes.add(magnetHash)
    }
    return classified
  }

  if (result.torrentUrl) {
    classified.status = "ready"
    classified.submitKind = "torrent"
    classified.submitUrl = result.torrentUrl
    classified.message = "Torrent URL resolved and queued for submission."
    seenUrls.add(normalizedTorrentUrl)
    return classified
  }

  classified.message = "The helper script ran, but no magnet or torrent URL was exposed."
  return classified
}

export function extractMagnetHash(magnetUrl: string): string {
  const match = decodeURIComponent(String(magnetUrl || "")).match(/btih:([a-z0-9]+)/i)
  return match ? match[1].toLowerCase() : ""
}

export function normalizeComparableUrl(url: string): string {
  return String(url || "").trim()
}

export function extractDetailHash(url: string): string {
  const match = String(url).match(/show-([a-f0-9]+)\.html/i)
  return match ? match[1].toLowerCase() : ""
}
