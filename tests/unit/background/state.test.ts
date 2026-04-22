import { describe, expect, it } from "vitest"

import type { ClassifiedBatchResult } from "../../../src/lib/shared/types"
import {
  createBatchJob,
  recordBatchResult,
  summarizeBatchResults
} from "../../../src/lib/background/job-state"
import { DEFAULT_SOURCE_CONFIG } from "../../../src/lib/sources/config/defaults"
import { DEFAULT_DOWNLOADER_CONFIG } from "../../../src/lib/downloader/config/defaults"
import { DEFAULT_BATCH_EXECUTION_CONFIG } from "../../../src/lib/batch-config/defaults"
import type { BatchRuntimeContext } from "../../../src/lib/background/types"

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

function createResult(overrides: Partial<ClassifiedBatchResult> = {}): ClassifiedBatchResult {
  return {
    ok: true,
    title: "Episode 01",
    detailUrl: "https://www.kisssub.org/show-deadbeef.html",
    hash: "deadbeef",
    magnetUrl: "magnet:?xt=urn:btih:deadbeef",
    torrentUrl: "",
    failureReason: "",
    status: "ready",
    deliveryMode: "magnet",
    submitUrl: "magnet:?xt=urn:btih:deadbeef",
    message: "Magnet resolved and queued for submission.",
    ...overrides
  }
}

describe("background job state helpers", () => {
  it("creates a job with isolated stats and the normalized save path state", () => {
    const runtimeContext = createRuntimeContext()

    expect(createBatchJob(18, 3, runtimeContext, DEFAULT_SOURCE_CONFIG, "D:\\Anime")).toEqual({
      sourceTabId: 18,
      savePath: "D:\\Anime",
      runtimeContext,
      sourceConfig: DEFAULT_SOURCE_CONFIG,
      stats: {
        total: 3,
        processed: 0,
        prepared: 0,
        submitted: 0,
        duplicated: 0,
        failed: 0
      },
      results: []
    })
  })

  it("records prepared, duplicate, and failed results into the running stats", () => {
    const runtimeContext = createRuntimeContext()
    const job = createBatchJob(18, 4, runtimeContext, DEFAULT_SOURCE_CONFIG, "")

    recordBatchResult(job, createResult())
    recordBatchResult(
      job,
      createResult({
        title: "Episode 02",
        detailUrl: "https://www.kisssub.org/show-feedface.html",
        status: "duplicate",
        deliveryMode: "",
        submitUrl: "",
        message: "Duplicate magnet hash skipped: deadbeef"
      })
    )
    recordBatchResult(
      job,
      createResult({
        title: "Episode 03",
        detailUrl: "https://www.kisssub.org/show-feedfeed.html",
        status: "failed",
        deliveryMode: "",
        submitUrl: "",
        message: "Blocked by filters: no filter matched"
      })
    )
    recordBatchResult(
      job,
      createResult({
        title: "Episode 04",
        detailUrl: "https://www.kisssub.org/show-cafebabe.html",
        status: "failed",
        deliveryMode: "",
        submitUrl: "",
        message: "No download link could be extracted from the detail page."
      })
    )

    expect(job.stats).toEqual({
      total: 4,
      processed: 4,
      prepared: 1,
      submitted: 0,
      duplicated: 1,
      failed: 2
    })
    expect(job.results).toHaveLength(4)
  })

  it("summarizes final batch results by terminal status", () => {
    expect(
      summarizeBatchResults([
        createResult({
          status: "submitted",
          message: "Magnet queued in qBittorrent."
        }),
        createResult({
          title: "Episode 02",
          status: "submitted",
          message: "Torrent file uploaded to qBittorrent."
        }),
        createResult({
          title: "Episode 03",
          status: "duplicate",
          deliveryMode: "",
          submitUrl: "",
          message: "Duplicate torrent URL skipped."
        }),
        createResult({
          title: "Episode 04",
          status: "failed",
          deliveryMode: "",
          submitUrl: "",
          message: "Blocked by filters: no filter matched"
        }),
        createResult({
          title: "Episode 05",
          status: "failed",
          deliveryMode: "",
          submitUrl: "",
          message: "qBittorrent submission failed: HTTP 403"
        })
      ])
    ).toEqual({
      submitted: 2,
      duplicated: 1,
      failed: 2
    })
  })
})
