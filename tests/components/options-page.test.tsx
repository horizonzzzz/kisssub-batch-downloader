import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { OptionsPage } from "../../components/options-page"

const settings = {
  qbBaseUrl: "http://127.0.0.1:17474",
  qbUsername: "admin",
  qbPassword: "123456",
  concurrency: 1,
  injectTimeoutMs: 15000,
  domSettleMs: 1200,
  retryCount: 1,
  remoteScriptUrl: "//1.acgscript.com/script/miobt/4.js?3",
  remoteScriptRevision: "20181120.2",
  lastSavePath: "",
  sourceDeliveryModes: {
    kisssub: "magnet",
    dongmanhuayuan: "magnet",
    acgrip: "torrent-file"
  }
}

describe("OptionsPage", () => {
  it("keeps the supported-sources section text without duplicate overview cards", async () => {
    const api = {
      loadSettings: vi.fn().mockResolvedValue(settings),
      saveSettings: vi.fn(),
      testConnection: vi.fn()
    }

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()
    expect(screen.getByText("Anime BT Batch")).toBeInTheDocument()
    expect(screen.getByText("支持源站")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Anime BT Batch 目前围绕动漫 BT 站点提供统一的批量解析入口。站点专属选项会单独展示，通用下载器与 提取节奏则集中管理。"
      )
    ).toBeInTheDocument()
    expect(screen.getByText("通用配置")).toBeInTheDocument()
    expect(screen.getByText("站点专属配置")).toBeInTheDocument()
    expect(screen.getByText("3 个动漫 BT 源站")).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Kisssub" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Dongmanhuayuan" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "ACG.RIP" })).toBeInTheDocument()
    expect(screen.getAllByText("Kisssub")).toHaveLength(2)
    expect(screen.getAllByText("Dongmanhuayuan")).toHaveLength(2)
    expect(screen.getAllByText("ACG.RIP")).toHaveLength(2)
    expect(screen.getByText("当前仅支持磁力链，无需切换下载策略。")).toBeInTheDocument()
    expect(screen.getByLabelText("Kisssub 外部脚本地址")).toBeInTheDocument()
    expect(screen.getByLabelText("Kisssub 脚本版本号")).toBeInTheDocument()
    expect(screen.getAllByText("下载策略")).toHaveLength(2)
    expect(screen.getAllByText("先下载种子再上传到 qB")).toHaveLength(2)
    expect(screen.getByPlaceholderText("http://127.0.0.1:7474")).toBeInTheDocument()
    expect(screen.queryByText("站点专属脚本")).not.toBeInTheDocument()
    expect(screen.queryByText("通用提取流程")).not.toBeInTheDocument()
    expect(screen.queryByText("已接入")).not.toBeInTheDocument()
    expect(
      screen.queryByText("依赖站点专属外部脚本辅助解析，可在下方维护脚本地址与版本号。")
    ).not.toBeInTheDocument()
    expect(screen.queryByText("当前沿用通用提取节奏，无需额外站点专属参数。")).not.toBeInTheDocument()
    expect(
      screen.queryByText("保留外部脚本注入配置，适配依赖第三方脚本的解析流程。")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText("当前沿用通用配置，后续若新增站点策略，可继续在这里扩展。")
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText("该站点目前只使用通用的 qB 连接、重试与注入节奏配置。")
    ).not.toBeInTheDocument()
    expect(screen.queryByText("Kisssub 允许覆盖外部脚本地址与版本号。")).not.toBeInTheDocument()
    expect(screen.queryByText("Dongmanhuayuan 当前使用通用提取流程。")).not.toBeInTheDocument()
    expect(screen.queryByText("本地目录助手")).not.toBeInTheDocument()
  })

  it("falls back to the 7474 default qB address when saved settings are incomplete", async () => {
    const api = {
      loadSettings: vi.fn().mockResolvedValue({}),
      saveSettings: vi.fn(),
      testConnection: vi.fn()
    }

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:7474")).toBeInTheDocument()
  })

  it(
    "loads settings on mount and saves edited values",
    async () => {
      const user = userEvent.setup()
      const api = {
        loadSettings: vi.fn().mockResolvedValue(settings),
        saveSettings: vi.fn().mockImplementation(async (nextSettings) => nextSettings),
        testConnection: vi.fn()
      }

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

      const usernameField = screen.getByLabelText("用户名")
      const acgRipCard = screen.getByRole("heading", { name: "ACG.RIP" }).closest(".options-source-card")
      expect(acgRipCard).not.toBeNull()
      await user.clear(usernameField)
      await user.type(usernameField, "operator")
      await user.click(within(acgRipCard as HTMLElement).getByRole("radio", { name: "直接提交种子链接" }))
      await user.click(screen.getByRole("button", { name: "保存设置" }))

      await waitFor(() => {
        expect(api.saveSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            qbUsername: "operator",
            sourceDeliveryModes: expect.objectContaining({
              acgrip: "torrent-url"
            })
          })
        )
      })

      expect(screen.getByRole("status")).toHaveTextContent("设置已保存。")
    },
    10000
  )

  it(
    "shows a live status region and connection feedback while testing",
    async () => {
      const user = userEvent.setup()
      let resolveConnection: ((value: { baseUrl: string; version: string }) => void) | undefined
      const api = {
        loadSettings: vi.fn().mockResolvedValue(settings),
        saveSettings: vi.fn(),
        testConnection: vi.fn().mockImplementation(
          () =>
            new Promise<{ baseUrl: string; version: string }>((resolve) => {
              resolveConnection = resolve
            })
        )
      }

      render(<OptionsPage api={api} />)

      expect(await screen.findByRole("status")).toHaveTextContent("设置已加载。")

      await user.click(screen.getByRole("button", { name: "测试 qB 连接" }))

      expect(api.testConnection).toHaveBeenCalledWith(settings)
      expect(screen.getByRole("button", { name: "测试 qB 连接" })).toBeDisabled()
      expect(screen.getByRole("status")).toHaveTextContent("正在测试连接。")

      resolveConnection?.({
        baseUrl: settings.qbBaseUrl,
        version: "5.0.0"
      })

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("连接成功。")
        expect(screen.getByRole("status")).toHaveTextContent("5.0.0")
      })
    },
    10000
  )
})
