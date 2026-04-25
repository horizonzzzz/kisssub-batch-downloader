import { dongmanhuayuanSubscriptionSourceFetcher } from "./dongmanhuayuan"
import type { SourceId } from "../../shared/types"
import { acgRipSubscriptionSourceFetcher } from "./acgrip"
import { bangumiMoeSubscriptionSourceFetcher } from "./bangumimoe"
import { comicatSubscriptionSourceFetcher } from "./comicat"
import type { SubscriptionSourceFetcher } from "./types"

const fetcherRegistry: Partial<Record<SourceId, SubscriptionSourceFetcher>> = {
  dongmanhuayuan: dongmanhuayuanSubscriptionSourceFetcher,
  acgrip: acgRipSubscriptionSourceFetcher,
  bangumimoe: bangumiMoeSubscriptionSourceFetcher,
  comicat: comicatSubscriptionSourceFetcher
}

export function getSubscriptionSourceFetcherById(sourceId: SourceId): SubscriptionSourceFetcher | null {
  return fetcherRegistry[sourceId] ?? null
}
