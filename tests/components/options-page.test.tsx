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
    acgrip: "torrent-file",
    bangumimoe: "magnet"
  },
  enabledSources: {
    kisssub: true,
    dongmanhuayuan: true,
    acgrip: true,
    bangumimoe: true
  }
}

describe("OptionsPage", () => {
  it(
    "renders the redesigned settings workspace and switches between the new views",
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
      expect(screen.getByText("通用设置")).toBeInTheDocument()
      expect(screen.getByText("站点管理")).toBeInTheDocument()
      expect(screen.getByText("关于与支持")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "连接与基础设置" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "站点配置" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "源站概览" })).toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Kisssub" })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Dongmanhuayuan" })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "ACG.RIP" })).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Bangumi.moe" })).not.toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "连接与基础设置" })).toBeInTheDocument()
      expect(screen.getByText("qB WebUI 兼容性提示")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "站点配置" }))

      expect(screen.getByRole("heading", { name: "站点配置" })).toBeInTheDocument()
      expect(screen.getByText("统一管理 4 个站点的启用状态和专属配置。")).toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: "BT 站点配置" })).not.toBeInTheDocument()
      expect(screen.queryByText("当前已启用 4 / 4 个站点")).not.toBeInTheDocument()
      expect(screen.getByText("当前已启用站点")).toBeInTheDocument()
      expect(screen.getByText("4 / 4")).toBeInTheDocument()
      expect(screen.getByText("Kisssub 爱恋动漫")).toBeInTheDocument()
      expect(screen.getByText("Dongmanhuayuan 动漫花园")).toBeInTheDocument()
      expect(screen.getAllByText("ACG.RIP").length).toBeGreaterThan(0)
      expect(screen.getByText("Bangumi.moe")).toBeInTheDocument()
      expect(
        screen.queryByText("启用你需要使用的 BT 站点，并为启用中的站点单独维护下载策略和专属参数。")
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText("禁用后不注入批量下载 UI，后台批处理也会同步拒绝该站点请求。")
      ).not.toBeInTheDocument()
      expect(screen.queryByText("整合番组表与字幕组的动漫资源站")).not.toBeInTheDocument()
      expect(screen.queryByText("面向动漫爱好者的BT资源交流站")).not.toBeInTheDocument()
      expect(screen.queryByText("分类清晰、以种子直下为主的ACG站")).not.toBeInTheDocument()
      expect(screen.queryByText("追番日历结合最新种子发布的社区")).not.toBeInTheDocument()
      expect(screen.queryByText("kisssub.org")).not.toBeInTheDocument()
      expect(screen.queryByText("dongmanhuayuan.com")).not.toBeInTheDocument()
      expect(screen.queryByText("acg.rip")).not.toBeInTheDocument()
      expect(screen.queryByText("bangumi.moe")).not.toBeInTheDocument()
      expect(screen.queryByText("当前脚本版本：20181120.2")).not.toBeInTheDocument()
      expect(screen.queryByText("此站点无需额外专属配置，保持默认即可。")).not.toBeInTheDocument()
      expect(screen.queryByRole("heading", { name: "Kisssub 专属配置" })).not.toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "源站概览" }))

      expect(screen.getByRole("heading", { name: "源站概览" })).toBeInTheDocument()
      expect(screen.getAllByRole("button", { name: "访问站点" })).toHaveLength(4)
      expect(screen.getByText("整合番组表与字幕组的动漫资源站")).toBeInTheDocument()
      expect(screen.getByText("面向动漫爱好者的BT资源交流站")).toBeInTheDocument()
      expect(screen.getByText("分类清晰、以种子直下为主的ACG站")).toBeInTheDocument()
      expect(screen.getByText("追番日历结合最新种子发布的社区")).toBeInTheDocument()
    },
    10000
  )

  it("renders a real site icon for each site in the site management cards", async () => {
    const user = userEvent.setup()
    const api = {
      loadSettings: vi.fn().mockResolvedValue(settings),
      saveSettings: vi.fn(),
      testConnection: vi.fn()
    }

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "站点配置" }))

    expect(screen.getByTestId("site-icon-kisssub").tagName).toBe("IMG")
    expect(screen.getByTestId("site-icon-dongmanhuayuan").tagName).toBe("IMG")
    expect(screen.getByTestId("site-icon-acgrip").tagName).toBe("IMG")
    expect(screen.getByTestId("site-icon-bangumimoe").tagName).toBe("IMG")
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
    "saves edited values across the general and site management views",
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

      await user.click(screen.getByRole("button", { name: "站点配置" }))

      const kisssubCard = screen.getByTestId("site-card-kisssub")
      const revisionField = within(kisssubCard).getByLabelText("Kisssub 脚本版本号")
      await user.clear(revisionField)
      await user.type(revisionField, "20260324.1")

      const acgripCard = screen.getByTestId("site-card-acgrip")
      await user.click(within(acgripCard).getByRole("radio", { name: "直接提交种子链接" }))

      await user.click(screen.getByRole("switch", { name: "Bangumi.moe 启用开关" }))

      await user.click(screen.getByRole("button", { name: "保存所有设置" }))

      await waitFor(() => {
        expect(api.saveSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            qbUsername: "operator",
            remoteScriptRevision: "20260324.1",
            sourceDeliveryModes: expect.objectContaining({
              acgrip: "torrent-url"
            }),
            enabledSources: expect.objectContaining({
              bangumimoe: false
            })
          })
        )
      })

      expect(screen.getByRole("status")).toHaveTextContent("设置已保存。")
    },
    20000
  )

  it(
    "preserves site-specific settings when a site is disabled and then enabled again",
    async () => {
      const user = userEvent.setup()
      const api = {
        loadSettings: vi.fn().mockResolvedValue(settings),
        saveSettings: vi.fn().mockImplementation(async (nextSettings) => nextSettings),
        testConnection: vi.fn()
      }

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "站点配置" }))

      const kisssubCard = screen.getByTestId("site-card-kisssub")
      const revisionField = within(kisssubCard).getByLabelText("Kisssub 脚本版本号")
      await user.clear(revisionField)
      await user.type(revisionField, "20260324.1")
      await user.click(within(kisssubCard).getByRole("radio", { name: "先下载种子再上传到 qB" }))

      const kisssubSwitch = screen.getByRole("switch", { name: "Kisssub 启用开关" })
      await user.click(kisssubSwitch)
      expect(kisssubSwitch).toHaveAttribute("aria-checked", "false")
      expect(within(kisssubCard).queryByLabelText("Kisssub 脚本版本号")).not.toBeInTheDocument()

      await user.click(kisssubSwitch)
      expect(kisssubSwitch).toHaveAttribute("aria-checked", "true")

      const restoredRevisionField = await within(kisssubCard).findByLabelText("Kisssub 脚本版本号")
      expect(restoredRevisionField).toHaveValue("20260324.1")
      expect(
        within(kisssubCard).getByRole("radio", { name: "先下载种子再上传到 qB" })
      ).toBeChecked()

      await user.click(screen.getByRole("button", { name: "保存所有设置" }))

      await waitFor(() => {
        expect(api.saveSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            remoteScriptRevision: "20260324.1",
            sourceDeliveryModes: expect.objectContaining({
              kisssub: "torrent-file"
            }),
            enabledSources: expect.objectContaining({
              kisssub: true
            })
          })
        )
      })
    },
    20000
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

  it("renders an svg icon in the extraction cadence advanced toggle", async () => {
    const api = {
      loadSettings: vi.fn().mockResolvedValue(settings),
      saveSettings: vi.fn(),
      testConnection: vi.fn()
    }

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    const advancedToggle = screen.getByRole("button", { name: /批量提取节奏/ })
    expect(advancedToggle.querySelector("svg")).not.toBeNull()
  })
})
