import { describe, expect, it } from "vitest"

import { getBatchPanelViewState } from "../../../src/components/batch-panel/state"

describe("getBatchPanelViewState", () => {
  it("keeps editing enabled but blocks empty-batch actions while idle", () => {
    expect(
      getBatchPanelViewState({
        running: false,
        selectedCount: 0,
        showAdvanced: false
      })
    ).toEqual({
      advancedState: "closed",
      disablePathActions: false,
      disableClear: true,
      disableDownload: true,
      downloadLabel: "批量下载"
    })
  })

  it("locks all mutable actions and swaps the primary label while running", () => {
    expect(
      getBatchPanelViewState({
        running: true,
        selectedCount: 3,
        showAdvanced: true
      })
    ).toEqual({
      advancedState: "open",
      disablePathActions: true,
      disableClear: true,
      disableDownload: true,
      downloadLabel: "发送中..."
    })
  })
})
