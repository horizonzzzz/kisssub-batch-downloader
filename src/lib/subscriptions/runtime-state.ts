import type { SubscriptionRuntimeRow } from "./store-types"

export function createEmptySubscriptionRuntimeRow(
  subscriptionId: string
): SubscriptionRuntimeRow {
  return {
    subscriptionId: String(subscriptionId ?? "").trim(),
    lastScanAt: null,
    lastMatchedAt: null,
    lastError: "",
    seenFingerprints: []
  }
}
