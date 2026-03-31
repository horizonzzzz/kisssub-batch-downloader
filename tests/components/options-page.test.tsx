import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { OptionsPage, type OptionsApi } from "../../components/options-page"

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
  },
  filterRules: []
}

function createOptionsApi(overrides: Partial<OptionsApi> = {}): OptionsApi {
  return {
    loadSettings: vi.fn().mockResolvedValue(settings),
    saveSettings: vi.fn().mockImplementation(async (nextSettings) => nextSettings),
    testConnection: vi.fn().mockResolvedValue({
      baseUrl: settings.qbBaseUrl,
      version: "5.0.0"
    }),
    ...overrides
  }
}

describe("OptionsPage", () => {
  beforeEach(() => {
    window.location.hash = ""
  })

  it("redirects empty and invalid hashes to the default general route", async () => {
    const api = createOptionsApi()

    window.location.hash = ""
    const firstRender = render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "连接与基础设置" })).toBeInTheDocument()
    expect(window.location.hash).toBe("#/general")

    firstRender.unmount()
    window.location.hash = "#/unknown"
    render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "连接与基础设置" })).toBeInTheDocument()
    expect(window.location.hash).toBe("#/general")
  })

  it("renders the redesigned general workspace on the default route", async () => {
    const api = createOptionsApi()

    window.location.hash = ""
    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()
    expect(window.location.hash).toBe("#/general")
    expect(screen.getAllByText("Anime BT Batch")).toHaveLength(1)

    const sidebarNav = screen.getByTestId("options-sidebar-groups")
    expect(within(sidebarNav).getAllByRole("button")).toHaveLength(5)
    expect(screen.getByRole("button", { name: "连接与基础设置" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "站点配置" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "过滤规则" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "批次历史" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "源站概览" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "连接与基础设置" })).toBeInTheDocument()
    expect(screen.getByText("qB WebUI 兼容性提示")).toBeInTheDocument()
  })

  it(
    "switches between the sites and overview views from the sidebar",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi()

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "站点配置" }))

      expect(window.location.hash).toBe("#/sites")
      expect(screen.getByRole("heading", { name: "站点配置" })).toBeInTheDocument()
      expect(screen.getByText("统一管理 4 个站点的启用状态和专属配置。")).toBeInTheDocument()
      expect(screen.getByText("当前已启用 4 / 4 个站点")).toBeInTheDocument()
      expect(screen.getByText("Kisssub 爱恋动漫")).toBeInTheDocument()
      expect(screen.getByText("Dongmanhuayuan 动漫花园")).toBeInTheDocument()
      expect(screen.getAllByText("ACG.RIP").length).toBeGreaterThan(0)
      expect(screen.getByText("Bangumi.moe")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "源站概览" }))

      expect(window.location.hash).toBe("#/overview")
      expect(screen.getByRole("heading", { name: "源站概览" })).toBeInTheDocument()
      expect(screen.getAllByRole("button", { name: "访问站点" })).toHaveLength(4)
      expect(screen.getByText("整合番组表与字幕组的动漫资源站")).toBeInTheDocument()
      expect(screen.getByText("面向动漫爱好者的BT资源交流站")).toBeInTheDocument()
      expect(screen.getByText("分类清晰、以种子直下为主的ACG站")).toBeInTheDocument()
      expect(screen.getByText("追番日历结合最新种子发布的社区")).toBeInTheDocument()
    },
    10000
  )

  it("renders the matching page when opened from a direct route hash", async () => {
    const api = createOptionsApi()

    window.location.hash = "#/sites"
    const firstRender = render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "站点配置" })).toBeInTheDocument()
    expect(screen.getByText("当前已启用 4 / 4 个站点")).toBeInTheDocument()

    firstRender.unmount()
    window.location.hash = "#/filters"
    const secondRender = render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "过滤规则" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "新建规则" })).toBeInTheDocument()

    secondRender.unmount()
    window.location.hash = "#/overview"
    render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "源站概览" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "访问站点" })).toHaveLength(4)
  })

  it("creates and saves a filter rule from the filters route", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi({
      saveSettings: vi.fn().mockImplementation(async (nextSettings) => nextSettings)
    })

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "过滤规则" }))

    expect(screen.getByRole("heading", { name: "过滤规则" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "新建规则" }))

    await user.type(screen.getByLabelText("规则名称"), "排除 RAW")
    await user.click(screen.getByRole("radio", { name: "排除" }))
    await user.type(screen.getByLabelText("标题排除"), "RAW")

    await user.click(screen.getByRole("button", { name: "保存规则" }))

    expect(screen.getByRole("button", { name: "拖拽排序 排除 RAW" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "保存所有设置" }))

    await waitFor(() => {
      expect(api.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          filterRules: [
            expect.objectContaining({
              name: "排除 RAW",
              action: "exclude",
              conditions: expect.objectContaining({
                titleExcludes: ["RAW"]
              })
            })
          ]
        })
      )
    })
  })

  it(
    "confirms before deleting a filter rule",
    async () => {
    const user = userEvent.setup()
    const api = createOptionsApi()

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "过滤规则" }))
    await user.click(screen.getByRole("button", { name: "新建规则" }))

    await user.type(screen.getByLabelText("规则名称"), "排除 RAW")
    await user.click(screen.getByRole("radio", { name: "排除" }))
    await user.type(screen.getByLabelText("标题排除"), "RAW")
    await user.click(screen.getByRole("button", { name: "保存规则" }))

    expect(screen.getByRole("button", { name: "拖拽排序 排除 RAW" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "删除 排除 RAW" }))

    expect(await screen.findByRole("alertdialog", { name: "删除过滤规则" })).toBeInTheDocument()
    expect(screen.getByText("确定删除规则“排除 RAW”吗？此操作不可恢复。")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "取消" }))

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog", { name: "删除过滤规则" })).not.toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: "拖拽排序 排除 RAW" })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "删除 排除 RAW" }))
    await user.click(screen.getByRole("button", { name: "删除" }))

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "拖拽排序 排除 RAW" })).not.toBeInTheDocument()
    })
    },
    10000
  )

  it("renders a real site icon for each site in the site management cards", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi()

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "站点配置" }))

    expect(screen.getByTestId("site-icon-kisssub")).toBeVisible()
    expect(screen.getByTestId("site-icon-dongmanhuayuan")).toBeVisible()
    expect(screen.getByTestId("site-icon-acgrip")).toBeVisible()
    expect(screen.getByTestId("site-icon-bangumimoe")).toBeVisible()
  })

  it("falls back to the 7474 default qB address when saved settings are incomplete", async () => {
    const api = createOptionsApi({
      loadSettings: vi.fn().mockResolvedValue({})
    })

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:7474")).toBeInTheDocument()
  })

  it(
    "saves edited values across the general and site management views",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi({
        saveSettings: vi.fn().mockImplementation(async (nextSettings) => nextSettings)
      })

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

  it("disables the save button while persisting settings", async () => {
    const user = userEvent.setup()
    let resolveSave:
      | ((value: typeof settings) => void)
      | undefined
    const api = createOptionsApi({
      saveSettings: vi.fn().mockImplementation(
        () =>
          new Promise<typeof settings>((resolve) => {
            resolveSave = resolve
          })
      )
    })

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    const saveButton = screen.getByRole("button", { name: "保存所有设置" })
    expect(saveButton).not.toBeDisabled()

    await user.click(saveButton)

    expect(api.saveSettings).toHaveBeenCalledTimes(1)
    expect(saveButton).toBeDisabled()

    resolveSave?.(settings)

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled()
    })
  })

  it(
    "preserves site-specific settings when a site is disabled and then enabled again",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi({
        saveSettings: vi.fn().mockImplementation(async (nextSettings) => nextSettings)
      })

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
      const api = createOptionsApi({
        testConnection: vi.fn().mockImplementation(
          () =>
            new Promise<{ baseUrl: string; version: string }>((resolve) => {
              resolveConnection = resolve
            })
        )
      })

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

  it("toggles the extraction cadence card open and closed", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi()

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    const advancedToggle = screen.getByRole("button", { name: /批量提取节奏/ })

    expect(advancedToggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByLabelText("并发数")).toBeInTheDocument()
    expect(screen.getByLabelText("重试次数")).toBeInTheDocument()
    expect(screen.getByLabelText("注入超时(ms)")).toBeInTheDocument()
    expect(screen.getByLabelText("稳定等待(ms)")).toBeInTheDocument()

    await user.click(advancedToggle)

    expect(advancedToggle).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByLabelText("并发数")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("重试次数")).not.toBeInTheDocument()

    await user.click(advancedToggle)

    expect(advancedToggle).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByLabelText("并发数")).toBeInTheDocument()
  })

  it(
    "preserves form edits when navigating to history and back to general",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi()

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

      const usernameField = screen.getByLabelText("用户名")
      await user.clear(usernameField)
      await user.type(usernameField, "testuser")

      expect(usernameField).toHaveValue("testuser")

      await user.click(screen.getByRole("button", { name: "批次历史" }))

      expect(window.location.hash).toBe("#/history")
      await waitFor(() => {
        expect(screen.queryByLabelText("用户名")).not.toBeInTheDocument()
      })

      await user.click(screen.getByRole("button", { name: "连接与基础设置" }))

      expect(window.location.hash).toBe("#/general")
      expect(await screen.findByLabelText("用户名")).toHaveValue("testuser")
    },
    15000
  )
})
