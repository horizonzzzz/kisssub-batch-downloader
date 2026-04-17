import { getDeliveryModePriority } from "./sources/delivery"
import type {
  AppSettings,
  BatchItem,
  ClassifiedBatchResult,
  ExtractionResult,
  SourceId
} from "./shared/types"

export function normalizeTitle(title: unknown): string {
  return String(title ?? "")
    .replace(/\s+/g, " ")
    .trim()
}

export function classifyPreparedBatchItem(
  item: BatchItem,
  settings: Pick<AppSettings, "sourceDeliveryModes">,
  seenHashes: Set<string>,
  seenUrls: Set<string>
): ClassifiedBatchResult | null {
  const preparedResult = createPreparedExtractionResult(item)
  if (!preparedResult) {
    return null
  }

  return classifyCandidateUrls(item.sourceId, preparedResult, settings, seenHashes, seenUrls)
}

export function createPreparedExtractionResult(item: BatchItem): ExtractionResult | null {
  const preparedCandidates = normalizePreparedCandidateLinks(
    item.magnetUrl,
    item.torrentUrl,
    item.detailUrl
  )
  if (!preparedCandidates.magnetUrl && !preparedCandidates.torrentUrl) {
    return null
  }

  return {
    ok: true,
    title: normalizeTitle(item.title) || item.detailUrl,
    detailUrl: item.detailUrl,
    hash: "",
    magnetUrl: preparedCandidates.magnetUrl || "",
    torrentUrl: preparedCandidates.torrentUrl || "",
    failureReason: ""
  }
}

export function classifyExtractionResult(
  sourceId: SourceId,
  result: ExtractionResult,
  settings: Pick<AppSettings, "sourceDeliveryModes">,
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
    deliveryMode: "",
    submitUrl: "",
    message: ""
  }

  if (!result.ok) {
    classified.message =
      result.failureReason || "No download link could be extracted from the detail page."
    return classified
  }

  return classifyCandidateUrls(sourceId, classified, settings, seenHashes, seenUrls)
}

export function extractMagnetHash(magnetUrl: string): string {
  const match = decodeURIComponent(String(magnetUrl || "")).match(/btih:([a-z0-9]+)/i)
  return match ? match[1].toLowerCase() : ""
}

export function extractDetailHash(url: string): string {
  const match = String(url).match(/show-([a-f0-9]+)\.html/i)
  return match ? match[1].toLowerCase() : ""
}

function classifyCandidateUrls(
  sourceId: SourceId,
  result: ExtractionResult,
  settings: Pick<AppSettings, "sourceDeliveryModes">,
  seenHashes: Set<string>,
  seenUrls: Set<string>
): ClassifiedBatchResult {
  const classified: ClassifiedBatchResult = {
    ...result,
    hash: result.hash || "",
    magnetUrl: normalizeComparableUrl(result.magnetUrl),
    torrentUrl: normalizeComparableUrl(result.torrentUrl),
    failureReason: result.failureReason || "",
    status: "failed",
    deliveryMode: "",
    submitUrl: "",
    message: ""
  }

  for (const deliveryMode of getDeliveryModePriority(sourceId, settings)) {
    if (deliveryMode === "magnet") {
      if (!classified.magnetUrl) {
        continue
      }

      const magnetHash = extractMagnetHash(classified.magnetUrl)
      if (magnetHash && seenHashes.has(magnetHash)) {
        classified.status = "duplicate"
        classified.message = `Duplicate magnet hash skipped: ${magnetHash}`
        return classified
      }

      classified.status = "ready"
      classified.deliveryMode = "magnet"
      classified.submitUrl = classified.magnetUrl
      classified.message = "Magnet resolved and queued for submission."
      if (magnetHash) {
        seenHashes.add(magnetHash)
      }
      return classified
    }

    if (!classified.torrentUrl) {
      continue
    }

    const normalizedTorrentUrl = normalizeComparableUrl(classified.torrentUrl)
    if (seenUrls.has(normalizedTorrentUrl)) {
      classified.status = "duplicate"
      classified.message = "Duplicate torrent URL skipped."
      return classified
    }

    classified.status = "ready"
    classified.deliveryMode = deliveryMode
    classified.submitUrl = classified.torrentUrl
    classified.message =
      deliveryMode === "torrent-file"
        ? "Torrent file resolved and queued for upload."
        : "Torrent URL resolved and queued for submission."
    seenUrls.add(normalizedTorrentUrl)
    return classified
  }

  classified.message = "No supported delivery mode was available for this source."
  return classified
}

function normalizeComparableUrl(url: string): string {
  return String(url || "").trim()
}

export function normalizePreparedCandidateLinks(
  magnetUrl: unknown,
  torrentUrl: unknown,
  detailUrl: string
): Pick<BatchItem, "magnetUrl" | "torrentUrl"> {
  const normalizedMagnetUrl =
    typeof magnetUrl === "string" && /^magnet:/i.test(normalizeComparableUrl(magnetUrl))
      ? normalizeComparableUrl(magnetUrl)
      : ""

  let normalizedTorrentUrl = ""
  if (typeof torrentUrl === "string") {
    const candidate = normalizeComparableUrl(torrentUrl)
    if (candidate) {
      try {
        normalizedTorrentUrl = new URL(candidate, detailUrl).href
      } catch {
        normalizedTorrentUrl = ""
      }
    }
  }

  return {
    ...(normalizedMagnetUrl ? { magnetUrl: normalizedMagnetUrl } : {}),
    ...(normalizedTorrentUrl ? { torrentUrl: normalizedTorrentUrl } : {})
  }
}
