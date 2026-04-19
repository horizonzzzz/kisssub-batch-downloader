import { getSourceAdapterById } from "."
import type { AppSettings, BatchItem, ExtractionResult } from "../shared/types"
import type { ExtractionContext } from "./types"

export function buildExtractionContext(settings: AppSettings): ExtractionContext {
  return {
    execution: {
      retryCount: settings.retryCount,
      injectTimeoutMs: settings.injectTimeoutMs,
      domSettleMs: settings.domSettleMs
    },
    source: {
      kisssub: {
        script: {
          url: settings.remoteScriptUrl,
          revision: settings.remoteScriptRevision
        }
      }
    }
  }
}

export async function extractSingleItem(
  item: BatchItem,
  settings: AppSettings
): Promise<ExtractionResult> {
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

  const context = buildExtractionContext(settings)
  return adapter.extractSingleItem(item, context)
}
