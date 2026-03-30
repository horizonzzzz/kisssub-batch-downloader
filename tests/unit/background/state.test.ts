import { describe, expect, it } from "vitest"

import type { ClassifiedBatchResult, Settings } from "../../../lib/shared/types"
import {
  createBatchJob,
  recordBatchResult,
  summarizeBatchResults
} from "../../../lib/background/job-state"
import { DEFAULT_SETTINGS } from "../../../lib/settings"

function createSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...DEFAULT_SETTINGS,
    sourceDeliveryModes: {
      ...DEFAULT_SETTINGS.sourceDeliveryModes
    },
    enabledSources: {
      ...DEFAULT_SETTINGS.enabledSources
    },
    ...overrides
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
    const settings = createSettings()

    expect(createBatchJob(18, 3, settings, "D:\\Anime")).toEqual({
      sourceTabId: 18,
      savePath: "D:\\Anime",
      settings: {
        ...settings,
        lastSavePath: "D:\\Anime"
      },
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
    const job = createBatchJob(18, 3, createSettings(), "")

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
        detailUrl: "https://www.kisssub.org/show-cafebabe.html",
        status: "failed",
        deliveryMode: "",
        submitUrl: "",
        message: "No download link could be extracted from the detail page."
      })
    )

    expect(job.stats).toEqual({
      total: 3,
      processed: 3,
      prepared: 1,
      submitted: 0,
      duplicated: 1,
      failed: 1
    })
    expect(job.results).toHaveLength(3)
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
          message: "qBittorrent submission failed: HTTP 403"
        })
      ])
    ).toEqual({
      submitted: 2,
      duplicated: 1,
      failed: 1
    })
  })
})
