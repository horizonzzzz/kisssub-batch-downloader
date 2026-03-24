import { render, screen, waitFor } from "@testing-library/react"
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
  it(
    "renders the redesigned settings workspace and switches between views",
    async () => {
      const user = userEvent.setup()
      const api = {
        loadSettings: vi.fn().mockResolvedValue(settings),
        saveSettings: vi.fn(),
        testConnection: vi.fn()
      }

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()
      expect(screen.getAllByText("Anime BT Batch")).toHaveLength(2)
      const brandIcon = screen.getByTestId("options-brand-icon")
      expect(brandIcon.tagName).toBe("IMG")
      expect(brandIcon).toHaveAttribute("src", expect.stringContaining("data:image/svg+xml"))
      expect(screen.getByText("通用设置")).toBeInTheDocument()
      expect(screen.getByText("站点专属配置")).toBeInTheDocument()
      expect(screen.getByText("关于与支持")).toBeInTheDocument()
      expect(screen.getByRole("link", { name: "查看 GitHub 仓库" })).toHaveAttribute(
        "href",
        "https://github.com/horizonzzzz/anime-bt-batch-downloader"
      )
      expect(screen.getByRole("heading", { name: "连接与基础设置" })).toBeInTheDocument()
      expect(screen.getByText("qB WebUI 兼容性提示")).toBeInTheDocument()
      expect(screen.queryByLabelText("Kisssub 外部脚本地址")).not.toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Kisssub" }))
      expect(screen.getByRole("heading", { name: "Kisssub 专属配置" })).toBeInTheDocument()
      expect(screen.getByLabelText("Kisssub 外部脚本地址")).toBeInTheDocument()
      expect(screen.getByLabelText("Kisssub 脚本版本号")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Dongmanhuayuan" }))
      expect(screen.getByRole("heading", { name: "Dongmanhuayuan 专属配置" })).toBeInTheDocument()
      expect(screen.getByText("暂无专属配置项")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "源站概览" }))
      expect(screen.getByRole("heading", { name: "源站概览" })).toBeInTheDocument()
      expect(screen.getByText("查看当前扩展支持的动漫 BT 站点状态。")).toBeInTheDocument()
      expect(screen.getAllByRole("button", { name: "访问站点" })).toHaveLength(3)
    },
    10000
  )

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
    "saves edited values across general and site-specific views",
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
    await user.clear(usernameField)
    await user.type(usernameField, "operator")

    await user.click(screen.getByRole("button", { name: "Kisssub" }))
    const revisionField = screen.getByLabelText("Kisssub 脚本版本号")
    await user.clear(revisionField)
    await user.type(revisionField, "20260324.1")

    await user.click(screen.getByRole("button", { name: "ACG.RIP" }))
    await user.click(screen.getByRole("radio", { name: "直接提交种子链接" }))

    await user.click(screen.getByRole("button", { name: "保存所有设置" }))

    await waitFor(() => {
      expect(api.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          qbUsername: "operator",
          remoteScriptRevision: "20260324.1",
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
