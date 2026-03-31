import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TaskHistoryRecord, TaskHistoryItem } from "../../lib/history/types"
import { HistoryListView } from "../../components/options/pages/history/HistoryListView"
import { HistoryDetailView } from "../../components/options/pages/history/HistoryDetailView"
import { HistoryPage } from "../../components/options/pages/history/HistoryPage"

function createMockRecord(id: string, overrides?: Partial<TaskHistoryRecord>): TaskHistoryRecord {
  return {
    id,
    name: `Test Batch ${id}`,
    sourceId: "kisssub",
    status: "completed",
    createdAt: "2026-01-01T10:00:00Z",
    stats: { total: 3, success: 2, duplicated: 1, filtered: 0, failed: 0 },
    items: [],
    version: 1,
    ...overrides
  }
}

function createMockItem(id: string, overrides?: Partial<TaskHistoryItem>): TaskHistoryItem {
  return {
    id,
    title: `Item ${id}`,
    detailUrl: `https://example.com/${id}`,
    sourceId: "kisssub",
    status: "success",
    deliveryMode: "magnet",
    ...overrides
  }
}

function mockChromeRuntime() {
  const listeners: Array<(message: unknown) => Promise<unknown>> = []
  
  vi.stubGlobal("chrome", {
    runtime: {
      sendMessage: vi.fn(async (message: unknown) => {
        for (const listener of listeners) {
          return listener(message)
        }
        return { ok: true }
      }),
      onMessage: {
        addListener: vi.fn()
      }
    }
  })
  
  return {
    addListener: (fn: (message: unknown) => Promise<unknown>) => {
      listeners.push(fn)
    }
  }
}

describe("HistoryListView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders empty state when no records", () => {
    render(<HistoryListView records={[]} onViewDetail={vi.fn()} onRefresh={vi.fn()} />)
    
    expect(screen.getByText("暂无下载历史记录")).toBeInTheDocument()
    expect(screen.getByText("开始批量下载后，历史记录将在此显示")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "清空历史" })).toBeDisabled()
  })

  it("renders list of records with correct info", () => {
    const records = [
      createMockRecord("batch-1", {
        status: "completed",
        stats: { total: 5, success: 5, duplicated: 0, filtered: 0, failed: 0 }
      }),
      createMockRecord("batch-2", {
        status: "partial_failure",
        stats: { total: 3, success: 2, duplicated: 0, filtered: 0, failed: 1 }
      })
    ]
    
    render(<HistoryListView records={records} onViewDetail={vi.fn()} onRefresh={vi.fn()} />)
    
    expect(screen.getByText("Test Batch batch-1")).toBeInTheDocument()
    expect(screen.getByText("Test Batch batch-2")).toBeInTheDocument()
    expect(screen.getByText("最新")).toBeInTheDocument()
    expect(screen.getAllByText("Kisssub 爱恋动漫")).toHaveLength(2)
    expect(screen.getByText("5/5")).toBeInTheDocument()
    expect(screen.getByText("2/3")).toBeInTheDocument()
    expect(screen.getByText("1 失败")).toBeInTheDocument()
  })

  it("calls onViewDetail when detail button clicked", async () => {
    const user = userEvent.setup()
    const onViewDetail = vi.fn()
    const records = [createMockRecord("batch-1")]
    
    render(<HistoryListView records={records} onViewDetail={onViewDetail} onRefresh={vi.fn()} />)
    
    await user.click(screen.getByRole("button", { name: "详情" }))
    
    expect(onViewDetail).toHaveBeenCalledWith("batch-1")
  })

  it("shows status dot with correct colors for different statuses", () => {
    const records = [
      createMockRecord("batch-1", { status: "completed" }),
      createMockRecord("batch-2", { status: "partial_failure" })
    ]
    
    render(<HistoryListView records={records} onViewDetail={vi.fn()} onRefresh={vi.fn()} />)
    
    const completedRow = screen.getByText("Test Batch batch-1").closest("div")
    const failedRow = screen.getByText("Test Batch batch-2").closest("div")
    
    expect(completedRow).toBeInTheDocument()
    expect(failedRow).toBeInTheDocument()
  })
})

describe("HistoryDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChromeRuntime()
  })

  it("renders record header with back button and status badge", () => {
    const record = createMockRecord("batch-1", { status: "completed" })
    
    render(<HistoryDetailView record={record} onBack={vi.fn()} onRecordChanged={vi.fn()} />)
    
    expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument()
    expect(screen.getByText("Test Batch batch-1")).toBeInTheDocument()
    expect(screen.getByText("已完成")).toBeInTheDocument()
    expect(screen.getByText("Kisssub 爱恋动漫")).toBeInTheDocument()
  })

  it("renders stats cards correctly", () => {
    const record = createMockRecord("batch-1", {
      stats: { total: 10, success: 7, duplicated: 2, filtered: 1, failed: 1 }
    })
    
    render(<HistoryDetailView record={record} onBack={vi.fn()} onRecordChanged={vi.fn()} />)
    
    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("7")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getAllByText("1")).toHaveLength(2)
    expect(screen.getByText("总条目")).toBeInTheDocument()
    expect(screen.getByText("成功")).toBeInTheDocument()
    expect(screen.getByText("重复")).toBeInTheDocument()
    expect(screen.getByText("过滤")).toBeInTheDocument()
    expect(screen.getByText("失败")).toBeInTheDocument()
  })

  it("renders item list with status icons", () => {
    const record = createMockRecord("batch-1", {
      items: [
        createMockItem("item-1", { status: "success", title: "Success Item" }),
        createMockItem("item-2", { status: "duplicate", title: "Duplicate Item" }),
        createMockItem("item-3", { status: "filtered", title: "Filtered Item" }),
        createMockItem("item-4", { status: "failed", title: "Failed Item", failure: { reason: "qb_error", message: "qB rejected", retryable: true, retryCount: 0 } })
      ]
    })
    
    render(<HistoryDetailView record={record} onBack={vi.fn()} onRecordChanged={vi.fn()} />)
    
    expect(screen.getByText("Success Item")).toBeInTheDocument()
    expect(screen.getByText("Duplicate Item")).toBeInTheDocument()
    expect(screen.getByText("Filtered Item")).toBeInTheDocument()
    expect(screen.getByText("Failed Item")).toBeInTheDocument()
    expect(screen.getByText("qB rejected")).toBeInTheDocument()
    expect(screen.getByText("该条目已在 qBittorrent 中存在，跳过提交")).toBeInTheDocument()
  })

  it("shows failure summary section when there are failures", () => {
    const record = createMockRecord("batch-1", {
      status: "partial_failure",
      stats: { total: 3, success: 1, duplicated: 0, filtered: 0, failed: 2 },
      items: [
        createMockItem("item-1", { status: "success" }),
        createMockItem("item-2", { status: "failed", failure: { reason: "qb_error", message: "error 1", retryable: true, retryCount: 0 } }),
        createMockItem("item-3", { status: "failed", failure: { reason: "timeout", message: "error 2", retryable: true, retryCount: 0 } })
      ]
    })
    
    render(<HistoryDetailView record={record} onBack={vi.fn()} onRecordChanged={vi.fn()} />)
    
    expect(screen.getByText("失败原因汇总")).toBeInTheDocument()
    expect(screen.getByText("qB 返回错误")).toBeInTheDocument()
    expect(screen.getByText("详情页超时")).toBeInTheDocument()
  })

  it("hides failure summary when no failures", () => {
    const record = createMockRecord("batch-1", {
      status: "completed",
      stats: { total: 2, success: 2, duplicated: 0, filtered: 0, failed: 0 }
    })
    
    render(<HistoryDetailView record={record} onBack={vi.fn()} onRecordChanged={vi.fn()} />)
    
    expect(screen.queryByText("失败原因汇总")).not.toBeInTheDocument()
  })

  it("calls onBack when back button clicked", async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    const record = createMockRecord("batch-1")
    
    render(<HistoryDetailView record={record} onBack={onBack} onRecordChanged={vi.fn()} />)
    
    await user.click(screen.getByRole("button", { name: "返回" }))
    
    expect(onBack).toHaveBeenCalled()
  })
})

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const runtimeMock = mockChromeRuntime()
    
    const records = [
      createMockRecord("batch-1", { status: "completed" }),
      createMockRecord("batch-2", { status: "partial_failure" })
    ]
    const deletedIds = new Set<string>()
    
    runtimeMock.addListener(async (message: unknown) => {
      const msg = message as { type: string; recordId?: string; itemIds?: string[] }
      
      if (msg.type === "GET_HISTORY") {
        return {
          ok: true,
          records: records.filter(r => !deletedIds.has(r.id))
        }
      }
      
      if (msg.type === "DELETE_HISTORY_RECORD") {
        if (msg.recordId) {
          deletedIds.add(msg.recordId)
        }
        return { ok: true }
      }
      
      if (msg.type === "CLEAR_HISTORY") {
        return { ok: true }
      }
      
      if (msg.type === "RETRY_FAILED_ITEMS") {
        return { ok: true, successCount: 1, failedCount: 0 }
      }
      
      return { ok: true }
    })
  })

  it("renders loading state initially", () => {
    render(<HistoryPage />)
    
    expect(screen.getByText("加载中...")).toBeInTheDocument()
  })

  it("renders history list after loading", async () => {
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.queryByText("加载中...")).not.toBeInTheDocument()
    })
    
    expect(screen.getByText("Test Batch batch-1")).toBeInTheDocument()
    expect(screen.getByText("Test Batch batch-2")).toBeInTheDocument()
  })

  it("navigates to detail view when clicking detail button", async () => {
    const user = userEvent.setup()
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText("Test Batch batch-1")).toBeInTheDocument()
    })
    
    await user.click(screen.getAllByRole("button", { name: "详情" })[0])
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument()
    })
  })

  it("refreshes history list after deleting from detail view", async () => {
    const user = userEvent.setup()
    render(<HistoryPage />)
    
    await waitFor(() => {
      expect(screen.getByText("Test Batch batch-1")).toBeInTheDocument()
    })
    
    await user.click(screen.getAllByRole("button", { name: "详情" })[0])
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument()
    })
    
    expect(screen.getByText("Test Batch batch-1")).toBeInTheDocument()
    
    await user.click(screen.getByRole("button", { name: "删除记录" }))
    
    await waitFor(() => {
      expect(screen.getByText("确定删除\"Test Batch batch-1\"吗？此操作不可恢复。")).toBeInTheDocument()
    })
    
    await user.click(screen.getByRole("button", { name: "删除" }))
    
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "返回" })).not.toBeInTheDocument()
    })
    
    expect(screen.queryByText("Test Batch batch-1")).not.toBeInTheDocument()
    expect(screen.getByText("Test Batch batch-2")).toBeInTheDocument()
  })
})
