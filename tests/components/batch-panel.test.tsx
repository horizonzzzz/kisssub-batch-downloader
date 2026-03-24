import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { BatchPanel } from "../../components/batch-panel"

function renderBatchPanel(overrides: Record<string, unknown> = {}) {
  const props = {
    sourceName: "Kisssub",
    isExpanded: true,
    selectedCount: 0,
    running: false,
    statusText: "就绪。先在当前列表页勾选资源。",
    savePath: "",
    savePathHint: "留空则使用当前下载器默认目录。",
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
    const launcherBrandIcon = screen.getByTestId("batch-launcher-brand-icon")
    expect(launcherBrandIcon.tagName).toBe("IMG")
    expect(launcherBrandIcon).toHaveAttribute(
      "src",
      expect.stringContaining("data:image/svg+xml")
    )
    expect(screen.queryByRole("button", { name: "批量下载" })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "展开批量下载面板" }))

    expect(onToggleExpanded).toHaveBeenCalledWith(true)
  })

  it("shows the expanded workspace with the prominent selected count", () => {
    renderBatchPanel()

    expect(screen.getByText("Kisssub 批量下载")).toBeInTheDocument()
    const panelBrandIcon = screen.getByTestId("batch-panel-brand-icon")
    expect(panelBrandIcon.tagName).toBe("IMG")
    expect(panelBrandIcon).toHaveAttribute(
      "src",
      expect.stringContaining("data:image/svg+xml")
    )
    expect(screen.getByText("已选资源")).toBeInTheDocument()
    expect(screen.getByText("0")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "批量下载" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "全选本页" })).toBeEnabled()
    expect(screen.queryByText("最近结果")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("临时下载路径")).not.toBeInTheDocument()
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
    expect(advancedToggle.querySelector("svg")).not.toBeNull()

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

    expect(openSettingsButton.querySelector("svg")).not.toBeNull()
    expect(minimizeButton.querySelector("svg")).not.toBeNull()

    await user.click(openSettingsButton)
    await user.click(minimizeButton)

    expect(onOpenSettings).toHaveBeenCalledTimes(1)
    expect(onToggleExpanded).toHaveBeenCalledWith(false)
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
