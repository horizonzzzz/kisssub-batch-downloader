import { describe, expect, it } from "vitest"

import { buildHistoryRecord } from "../../../src/lib/background/history-builder"
import { DEFAULT_SOURCE_CONFIG } from "../../../src/lib/sources/config/defaults"
import { DEFAULT_DOWNLOADER_CONFIG } from "../../../src/lib/downloader/config/defaults"
import { DEFAULT_BATCH_EXECUTION_CONFIG } from "../../../src/lib/batch-config/defaults"
import type { BatchJob, BatchRuntimeContext } from "../../../src/lib/background/types"

function createRuntimeContext(): BatchRuntimeContext {
  return {
    execution: DEFAULT_BATCH_EXECUTION_CONFIG,
    filters: [],
    downloaderConfig: DEFAULT_DOWNLOADER_CONFIG,
    extractionContext: {
      execution: {
        retryCount: DEFAULT_BATCH_EXECUTION_CONFIG.retryCount,
        injectTimeoutMs: DEFAULT_BATCH_EXECUTION_CONFIG.injectTimeoutMs,
        domSettleMs: DEFAULT_BATCH_EXECUTION_CONFIG.domSettleMs
      }
    }
  }
}

describe("buildHistoryRecord", () => {
  it("marks filter-blocked failures as non-retryable filtered items", () => {
    const job: BatchJob = {
      sourceTabId: 1,
      savePath: "",
      runtimeContext: createRuntimeContext(),
      sourceConfig: DEFAULT_SOURCE_CONFIG,
      stats: {
        total: 1,
        processed: 1,
        prepared: 0,
        submitted: 0,
        duplicated: 0,
        failed: 1
      },
      results: [
        {
          ok: false,
          title: "[喵萌奶茶屋] Episode 01 [RAW]",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          hash: "",
          magnetUrl: "",
          torrentUrl: "",
          failureReason: "filtered_out",
          status: "failed",
          deliveryMode: "",
          submitUrl: "",
          message: "Blocked by filters: no filter matched"
        }
      ]
    }

    const record = buildHistoryRecord(job, "kisssub")

    expect(record.status).toBe("partial_failure")
    expect(record.originalDownloaderId).toBe("qbittorrent")
    expect(record.lastRetriedDownloaderId).toBeUndefined()
    expect(record.stats).toMatchObject({
      total: 1,
      success: 0,
      duplicated: 0,
      failed: 1
    })
    expect(record.items[0]).toMatchObject({
      status: "failed"
    })
    expect(record.items[0].failure).toMatchObject({
      reason: "filtered_out",
      message: "Blocked by filters: no filter matched",
      retryable: false,
      retryCount: 0
    })
  })
})
