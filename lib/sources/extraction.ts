import { getSourceAdapterById } from "."
import type { BatchItem, ExtractionResult, Settings } from "../shared/types"

export async function extractSingleItem(item: BatchItem, settings: Settings): Promise<ExtractionResult> {
  const adapter = getSourceAdapterById(item.sourceId)
  if (!adapter) {
    return {
      ok: false,
      title: item.title,
      detailUrl: item.detailUrl,
      hash: "",
      magnetUrl: "",
      torrentUrl: "",
      failureReason: `Unsupported source adapter: ${item.sourceId}`
    }
  }

  return adapter.extractSingleItem(item, settings)
}
