import { getSourceAdapterById } from "../sources"
import {
  normalizePreparedCandidateLinks,
  normalizeTitle
} from "../download-preparation"
import type {
  BatchItem
} from "../shared/types"

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
    const preparedCandidates = normalizePreparedCandidateLinks(
      (item as BatchItem).magnetUrl,
      (item as BatchItem).torrentUrl,
      detailUrl
    )

    normalized.push({
      sourceId: adapter.id,
      detailUrl,
      title: normalizeTitle((item as BatchItem).title) || detailUrl,
      ...preparedCandidates
    })
  }

  return normalized
}
