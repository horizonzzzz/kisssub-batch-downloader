import type { SourceId } from "../../shared/types"
import type { SourceSubscriptionScanCandidate } from "../../sources/types"

export type SubscriptionSourceFetchFunction = typeof fetch

export type SubscriptionSourceFetcher = {
  sourceId: SourceId
  fetchCandidates(fetchImpl?: SubscriptionSourceFetchFunction): Promise<SourceSubscriptionScanCandidate[]>
}
