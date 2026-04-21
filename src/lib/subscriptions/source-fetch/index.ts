import type { SourceId } from "../../shared/types"
import { acgRipSubscriptionSourceFetcher } from "./acgrip"
import { bangumiMoeSubscriptionSourceFetcher } from "./bangumimoe"
import type { SubscriptionSourceFetcher } from "./types"

const fetcherRegistry: Partial<Record<SourceId, SubscriptionSourceFetcher>> = {
  acgrip: acgRipSubscriptionSourceFetcher,
  bangumimoe: bangumiMoeSubscriptionSourceFetcher
}

export function getSubscriptionSourceFetcherById(sourceId: SourceId): SubscriptionSourceFetcher | null {
  return fetcherRegistry[sourceId] ?? null
}
