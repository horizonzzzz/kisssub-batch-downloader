import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { BatchPanel } from "../../src/components/batch-panel"

function renderBatchPanel(overrides: Record<string, unknown> = {}) {
  const props = {
    sourceName: "Kisssub",
    isExpanded: true,
    selectedCount: 0,
    running: false,
    statusText: "就绪。先在当前列表页勾选资源。",
    savePath: "",
    savePathHint: "留空则使用当前下载器默认目录。",
    filterStatus: {
      summaryText: "筛选规则：未启用",
      emptyStateText: "当前站点未加载可生效的筛选规则，默认全部保留。",
      filters: []
    },
    onToggleExpanded: vi.fn(),
    onSelectAll: vi.fn(),
    onClear: vi.fn(),
    onSavePathChange: vi.fn(),
    onClearSavePath: vi.fn(),
    onDownload: vi.fn(),
    onOpenSettings: vi.fn(),
    ...overrides
  } as any

  return render(<BatchPanel {...props} />)
}

describe("BatchPanel", () => {
  it("shows filter status empty state by default", () => {
    renderBatchPanel()

    expect(screen.getByText("筛选规则：未启用")).toBeInTheDocument()
    expect(
      screen.getByText("当前站点未加载可生效的筛选规则，默认全部保留。")
    ).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "收起规则详情" })).not.toBeInTheDocument()
  })

  it("shows an icon-only action that opens filter settings when effective rules exist", async () => {
    const user = userEvent.setup()
    const onOpenSettings = vi.fn()

    renderBatchPanel({
      onOpenSettings,
      filterStatus: {
        summaryText: "筛选规则：已启用 2 条",
        emptyStateText: null,
        filters: [
          {
            id: "filter-1",
            name: "爱恋 1080 简繁",
            summary: "字幕组包含“爱恋字幕社”；标题包含“1080”"
          },
          {
            id: "filter-2",
            name: "Bangumi 专用",
            summary: "站点是 Bangumi.moe"
          }
        ]
      }
    })

    expect(screen.getByText("筛选规则：已启用 2 条")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "查看规则详情" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "收起规则详情" })).not.toBeInTheDocument()

    const filterSettingsButton = screen.getByRole("button", { name: "打开过滤规则配置" })
    await user.click(filterSettingsButton)

    expect(onOpenSettings).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("爱恋 1080 简繁")).not.toBeInTheDocument()
  })


  it("renders a collapsed launcher when minimized", async () => {
    const user = userEvent.setup()
    const onToggleExpanded = vi.fn()

    renderBatchPanel({
      isExpanded: false,
      selectedCount: 3,
      onToggleExpanded
    })

    expect(screen.getByRole("button", { name: "展开批量下载面板" })).toBeInTheDocument()
    expect(screen.getByText("批量下载")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByTestId("batch-launcher-brand-icon")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "批量下载" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "展开批量下载面板" }))

    expect(onToggleExpanded).toHaveBeenCalledWith(true)
  })

  it("exposes data anchors for the launcher and expanded panel surfaces", async () => {
    const user = userEvent.setup()

    const { rerender } = renderBatchPanel({
      isExpanded: false,
      selectedCount: 2
    })

    expect(screen.getByRole("button", { name: "展开批量下载面板" })).toHaveAttribute(
      "data-anime-bt-role",
      "launcher-button"
    )

    rerender(
      <BatchPanel
        {...({
          sourceName: "Kisssub",
          isExpanded: true,
          selectedCount: 2,
          running: false,
          statusText: "本次将使用自定义路径。",
          savePath: "D:\\Downloads",
          savePathHint: "本次任务将请求下载器保存到：D:\\Downloads",
          filterStatus: {
            summaryText: "筛选规则：未启用",
            emptyStateText: "当前站点未加载可生效的筛选规则，默认全部保留。",
            filters: []
          },
          onToggleExpanded: vi.fn(),
          onSelectAll: vi.fn(),
          onClear: vi.fn(),
          onSavePathChange: vi.fn(),
          onClearSavePath: vi.fn(),
          onDownload: vi.fn(),
          onOpenSettings: vi.fn()
        } as any)}
      />
    )

    expect(screen.getByLabelText("批量下载面板")).toHaveAttribute(
      "data-anime-bt-role",
      "panel-shell"
    )
    expect(screen.getByRole("button", { name: "批量下载" })).toHaveAttribute(
      "data-anime-bt-role",
      "footer-primary"
    )

    await user.click(screen.getByRole("button", { name: "高级选项" }))

    expect(screen.getByLabelText("临时下载路径")).toHaveAttribute(
      "data-anime-bt-role",
      "path-input"
    )
    expect(screen.getByRole("button", { name: "清空路径" })).toHaveAttribute(
      "data-anime-bt-role",
      "path-clear"
    )
  })

  it("disables select-all when there are no selectable items", () => {
    renderBatchPanel({
      selectedCount: 0,
      selectableCount: 0
    })

    expect(screen.getByRole("button", { name: "全选本页" })).toBeDisabled()
  })

  it("lets the user open advanced options, edit the save path, and clear it", async () => {
    const user = userEvent.setup()
    const onClearSavePath = vi.fn()

    function Harness() {
      const [savePath, setSavePath] = useState("D:\\Downloads")

      return (
        <BatchPanel
          {...({
            sourceName: "Kisssub",
            isExpanded: true,
            selectedCount: 2,
            running: false,
            statusText: "本次将使用自定义路径。",
            savePath,
            savePathHint: "本次任务将请求下载器保存到：D:\\Downloads",
            filterStatus: {
              summaryText: "筛选规则：未启用",
              emptyStateText: "当前站点未加载可生效的筛选规则，默认全部保留。",
              filters: []
            },
            onToggleExpanded: vi.fn(),
            onSelectAll: vi.fn(),
            onClear: vi.fn(),
            onSavePathChange: setSavePath,
            onClearSavePath: () => {
              setSavePath("")
              onClearSavePath()
            },
            onDownload: vi.fn(),
            onOpenSettings: vi.fn()
          } as any)}
        />
      )
    }

    render(<Harness />)

    const advancedToggle = screen.getByRole("button", { name: "高级选项" })

    await user.click(advancedToggle)

    const input = screen.getByLabelText("临时下载路径")
    expect(input).toHaveValue("D:\\Downloads")

    await user.clear(input)
    await user.type(input, "E:\\Anime")
    expect(input).toHaveValue("E:\\Anime")

    await user.click(screen.getByRole("button", { name: "清空路径" }))
    expect(input).toHaveValue("")
    expect(onClearSavePath).toHaveBeenCalledTimes(1)
  })

  it("wires the settings and minimize controls in the header", async () => {
    const user = userEvent.setup()
    const onOpenSettings = vi.fn()
    const onToggleExpanded = vi.fn()

    renderBatchPanel({
      selectedCount: 1,
      onOpenSettings,
      onToggleExpanded
    })

    const openSettingsButton = screen.getByRole("button", { name: "打开设置页" })
    const minimizeButton = screen.getByRole("button", { name: "最小化批量下载面板" })

    await user.click(openSettingsButton)
    await user.click(minimizeButton)

    expect(onOpenSettings).toHaveBeenCalledTimes(1)

    const panel = screen.getByRole("complementary", { name: "批量下载面板" })
    const animationEndEvent = new Event("animationend", { bubbles: true })
    Object.defineProperty(animationEndEvent, "animationName", {
      value: "anime-bt-panel-collapse-keyframes"
    })
    panel.dispatchEvent(animationEndEvent)

    await waitFor(() => {
      expect(onToggleExpanded).toHaveBeenCalledWith(false)
    })
  })

  it("shows a loading download action and locks editing while the batch is running", async () => {
    const user = userEvent.setup()

    renderBatchPanel({
      selectedCount: 2,
      running: true,
      statusText: "正在提交到 qBittorrent。"
    })

    await user.click(screen.getByRole("button", { name: "高级选项" }))

    expect(screen.getByRole("button", { name: "发送中..." })).toBeDisabled()
    expect(screen.getByRole("button", { name: "全选本页" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "清空选择" })).toBeDisabled()
    expect(screen.getByLabelText("临时下载路径")).toBeDisabled()
    expect(screen.getByRole("button", { name: "清空路径" })).toBeDisabled()
    expect(screen.getByText("正在提交到 qBittorrent。")).toBeInTheDocument()
  })
})
