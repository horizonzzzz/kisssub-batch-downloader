import { describe, expect, it } from "vitest"

import { buildHistoryRecord } from "../../../lib/background/history-builder"
import { DEFAULT_SETTINGS } from "../../../lib/settings"
import type { BatchJob } from "../../../lib/background/types"

describe("buildHistoryRecord", () => {
  it("maps filtered batch results into filtered history items and stats", () => {
    const job: BatchJob = {
      sourceTabId: 1,
      savePath: "",
      settings: DEFAULT_SETTINGS,
      stats: {
        total: 1,
        processed: 1,
        prepared: 0,
        submitted: 0,
        duplicated: 0,
        filtered: 1,
        failed: 0
      },
      results: [
        {
          ok: false,
          title: "[喵萌奶茶屋] Episode 01 [RAW]",
          detailUrl: "https://www.kisssub.org/show-deadbeef.html",
          hash: "",
          magnetUrl: "",
          torrentUrl: "",
          failureReason: "",
          status: "filtered",
          deliveryMode: "",
          submitUrl: "",
          message: "Filtered by group: RAW 过滤器 / rule: 排除 RAW"
        }
      ]
    }

    const record = buildHistoryRecord(job, "kisssub")

    expect(record.status).toBe("completed")
    expect(record.stats).toMatchObject({
      total: 1,
      success: 0,
      duplicated: 0,
      filtered: 1,
      failed: 0
    })
    expect(record.items[0]).toMatchObject({
      status: "filtered"
    })
    expect(record.items[0].failure).toBeUndefined()
  })
})
