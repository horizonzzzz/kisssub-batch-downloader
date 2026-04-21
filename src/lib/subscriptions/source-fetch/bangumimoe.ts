import { buildBangumiMoeTorrentDownloadUrl } from "../../sources/bangumimoe"
import type { SourceSubscriptionScanCandidate } from "../../sources/types"
import type { SubscriptionSourceFetchFunction, SubscriptionSourceFetcher } from "./types"

const BANGUMI_LATEST_API_URL = "https://bangumi.moe/api/torrent/latest"

type BangumiLatestResponse = {
  torrents?: Array<{
    _id?: string
    title?: string
    magnet?: string
  }>
}

function normalize(value: string | null | undefined) {
  return String(value ?? "").replace(/\s+/g, " ").trim()
}

export async function fetchBangumiMoeSubscriptionCandidates(
  fetchImpl: SubscriptionSourceFetchFunction = fetch
): Promise<SourceSubscriptionScanCandidate[]> {
  const response = await fetchImpl(BANGUMI_LATEST_API_URL)
  if (!response.ok) {
    throw new Error(`Bangumi.moe subscription fetch failed: ${response.status}`)
  }

  const payload = await response.json() as BangumiLatestResponse
  const torrents = Array.isArray(payload.torrents) ? payload.torrents : []

  return torrents.flatMap((torrent) => {
    const id = normalize(torrent._id)
    const title = normalize(torrent.title)
    if (!id || !title) {
      return []
    }

    const magnetUrl = /^magnet:/i.test(normalize(torrent.magnet)) ? normalize(torrent.magnet) : ""

    return [{
      sourceId: "bangumimoe",
      title,
      detailUrl: `https://bangumi.moe/torrent/${id}`,
      magnetUrl,
      torrentUrl: buildBangumiMoeTorrentDownloadUrl(id, title),
      subgroup: ""
    }]
  })
}

export const bangumiMoeSubscriptionSourceFetcher: SubscriptionSourceFetcher = {
  sourceId: "bangumimoe",
  fetchCandidates(fetchImpl) {
    return fetchBangumiMoeSubscriptionCandidates(fetchImpl)
  }
}
