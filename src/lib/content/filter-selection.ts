import { decideFilterAction } from "../filter-rules"
import type { BatchItem, FilterEntry } from "../shared/types"

export type SelectableBatchItem = {
  item: BatchItem
  selectable: boolean
  blockedReason: string
  blockedReasonCode: "unmatched-rule" | null
}

export function buildSelectableBatchItem(
  item: BatchItem,
  filters: FilterEntry[]
): SelectableBatchItem {
  const decision = decideFilterAction({
    sourceId: item.sourceId,
    title: item.title,
    filters
  })

  return {
    item,
    selectable: decision.accepted,
    blockedReason: decision.accepted ? "" : decision.message,
    blockedReasonCode:
      decision.accepted || decision.message !== "Blocked by filters: no filter matched"
        ? null
        : "unmatched-rule"
  }
}
