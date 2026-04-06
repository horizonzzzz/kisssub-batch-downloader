import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { OptionsPage, type OptionsApi } from "../../components/options-page"

const settings = {
  currentDownloaderId: "qbittorrent",
  downloaders: {
    qbittorrent: {
      baseUrl: "http://127.0.0.1:17474",
      username: "admin",
      password: "123456"
    },
    transmission: {
      baseUrl: "http://127.0.0.1:9091/transmission/rpc",
      username: "transmission",
      password: "secret"
    }
  },
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
  filters: []
}

function createOptionsApi(overrides: Partial<OptionsApi> = {}): OptionsApi {
  return {
    loadSettings: vi.fn().mockResolvedValue(settings),
    saveSettings: vi.fn().mockImplementation(async (nextSettings) => nextSettings),
    testConnection: vi.fn().mockResolvedValue({
      downloaderId: "qbittorrent",
      displayName: "qBittorrent",
      baseUrl: settings.downloaders.qbittorrent.baseUrl,
      version: "5.0.0"
    }),
    ...overrides
  }
}

describe("OptionsPage", () => {
  beforeEach(() => {
    window.location.hash = ""
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: () => false
    })
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn()
    })
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: vi.fn()
    })
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn()
    })
  })

  it("redirects empty and invalid hashes to the default general route", async () => {
    const api = createOptionsApi()

    window.location.hash = ""
    const firstRender = render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "下载器与基础设置" })).toBeInTheDocument()
    expect(window.location.hash).toBe("#/general")

    firstRender.unmount()
    window.location.hash = "#/unknown"
    render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "下载器与基础设置" })).toBeInTheDocument()
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
    expect(screen.getByRole("button", { name: "下载器与基础设置" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "站点配置" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "过滤规则" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "批次历史" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "源站概览" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "下载器与基础设置" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "下载器选择" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "qBittorrent" })).toBeChecked()
    expect(screen.getByText("下载器兼容性提示")).toBeInTheDocument()
  })

  it("switches to transmission settings fields when transmission is selected", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi()

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "qBittorrent" })).toBeChecked()
    expect(screen.getByRole("radio", { name: "Transmission" })).not.toBeChecked()

    await user.click(screen.getByRole("radio", { name: "Transmission" }))

    expect(screen.getByRole("radio", { name: "Transmission" })).toBeChecked()
    expect(screen.getByDisplayValue("http://127.0.0.1:9091/transmission/rpc")).toBeInTheDocument()
    expect(screen.getByText("Transmission 配置")).toBeInTheDocument()
  })

  it("updates the sidebar current downloader label when switching downloaders", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi()

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()
    expect(screen.getByText("当前下载器：qBittorrent")).toBeInTheDocument()

    await user.click(screen.getByRole("radio", { name: "Transmission" }))

    expect(screen.getByText("当前下载器：Transmission")).toBeInTheDocument()
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
    expect(screen.getByText("筛选器")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "新增筛选器" })).toBeInTheDocument()
    expect(screen.getByText("快速测试")).toBeInTheDocument()
    expect(screen.getByText("还没有筛选器")).toBeInTheDocument()

    secondRender.unmount()
    window.location.hash = "#/overview"
    render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "源站概览" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "访问站点" })).toHaveLength(4)
  })

  it(
    "includes filter edits when saving settings",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi({
        saveSettings: vi.fn().mockImplementation(async (nextSettings) => nextSettings)
      })

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "过滤规则" }))
      await user.click(screen.getByRole("button", { name: "新增筛选器" }))
      await user.type(screen.getByLabelText("筛选器名称"), "爱恋 1080 简繁")
      await user.click(screen.getByLabelText("必须条件字段 1"))
      await user.click(await screen.findByRole("option", { name: "字幕组" }))
      await user.clear(screen.getByLabelText("必须条件值 1"))
      await user.type(screen.getByLabelText("必须条件值 1"), "爱恋字幕社")
      await user.click(screen.getByRole("button", { name: "添加任一条件" }))
      await user.clear(screen.getByLabelText("任一条件值 1"))
      await user.type(screen.getByLabelText("任一条件值 1"), "简")
      await user.click(screen.getByRole("button", { name: "保存筛选器" }))

      expect(screen.getByText("爱恋 1080 简繁")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "保存所有设置" }))

      await waitFor(() => {
        expect(api.saveSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            filters: expect.arrayContaining([
              expect.objectContaining({
                name: "爱恋 1080 简繁",
                must: expect.arrayContaining([
                  expect.objectContaining({
                    field: "subgroup",
                    value: "爱恋字幕社"
                  })
                ]),
                any: expect.arrayContaining([
                  expect.objectContaining({
                    field: "title",
                    value: "简"
                  })
                ])
              })
            ])
          })
        )
      })
    },
    10000
  )

  it("adds the 爱恋 1080 简中 preset rule directly and allows duplicates", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi()

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "过滤规则" }))
    await user.click(screen.getAllByRole("button", { name: "添加实例规则" })[0])

    const filtersList = screen.getByTestId("filters-list")

    expect(within(filtersList).getAllByRole("heading", { name: "爱恋 1080 简中" })).toHaveLength(1)
    expect(screen.getByText(/字幕组包含“爱恋字幕社”/)).toBeInTheDocument()
    expect(screen.getByText(/标题包含“1080”/)).toBeInTheDocument()
    expect(screen.getByText(/标题包含“简中”/)).toBeInTheDocument()

    await user.click(screen.getAllByRole("button", { name: "添加实例规则" })[0])

    expect(within(filtersList).getAllByRole("heading", { name: "爱恋 1080 简中" })).toHaveLength(2)
  })

  it("focuses and closes the filter sheet with keyboard controls", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi()

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "过滤规则" }))
    await user.click(screen.getByRole("button", { name: "新增筛选器" }))

    expect(await screen.findByRole("dialog", { name: "新增筛选器" })).toBeInTheDocument()
    expect(screen.getByLabelText("筛选器名称")).toHaveFocus()

    await user.keyboard("{Escape}")

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "新增筛选器" })).not.toBeInTheDocument()
    })
  })

  it(
    "runs the simplified test bench against current filter values",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi()

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "过滤规则" }))
      await user.click(screen.getByRole("button", { name: "新增筛选器" }))
      await user.type(screen.getByLabelText("筛选器名称"), "爱恋 1080 简繁")
      await user.click(screen.getByLabelText("必须条件字段 1"))
      await user.click(await screen.findByRole("option", { name: "字幕组" }))
      await user.clear(screen.getByLabelText("必须条件值 1"))
      await user.type(screen.getByLabelText("必须条件值 1"), "爱恋字幕社")
      await user.click(screen.getByRole("button", { name: "添加必须条件" }))
      await user.clear(screen.getByLabelText("必须条件值 2"))
      await user.type(screen.getByLabelText("必须条件值 2"), "1080")
      await user.click(screen.getByRole("button", { name: "添加任一条件" }))
      await user.clear(screen.getByLabelText("任一条件值 1"))
      await user.type(screen.getByLabelText("任一条件值 1"), "简")
      await user.click(screen.getByRole("button", { name: "保存筛选器" }))

      fireEvent.change(screen.getByLabelText("资源标题"), {
        target: {
          value:
            "[爱恋字幕社][1月新番][金牌得主 第二季][Medalist][08][1080p][MP4][GB][简中]"
        }
      })
      await user.click(screen.getByRole("button", { name: "开始测试" }))

      expect(
        await screen.findByText((content) =>
          content.includes("命中筛选器「爱恋 1080 简繁」")
        )
      ).toBeInTheDocument()
      expect(screen.getByText("测试结果")).toBeInTheDocument()
      expect(screen.getByText("自动识别的字幕组：爱恋字幕社")).toBeInTheDocument()
      expect(screen.getByText("命中筛选器：爱恋 1080 简繁")).toBeInTheDocument()
    },
    10000
  )

  it("shows the simplified filters copy instead of strategy-mode copy", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi()

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "过滤规则" }))
    expect(screen.getByText(/只配置你想保留的资源特征/)).toBeInTheDocument()
    expect(screen.getByText(/如果没有启用筛选器，则默认全部保留/)).toBeInTheDocument()
    expect(screen.queryByText("策略工作台")).not.toBeInTheDocument()
    expect(screen.queryByText("默认策略：")).not.toBeInTheDocument()
  })

  it("shows a clear empty state for optional any conditions", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi()

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "过滤规则" }))
    await user.click(screen.getByRole("button", { name: "新增筛选器" }))

    expect(
      screen.getByText("未设置额外的“任一”条件。")
    ).toBeInTheDocument()
  })

  it("switches source conditions to a site selector", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi()

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "过滤规则" }))
    await user.click(screen.getByRole("button", { name: "新增筛选器" }))

    await user.click(screen.getByLabelText("必须条件字段 1"))
    await user.click(await screen.findByRole("option", { name: "站点" }))

    await user.click(screen.getByLabelText("必须条件值 1"))
    expect(await screen.findByRole("option", { name: "Kisssub" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "ACG.RIP" })).toBeInTheDocument()
    expect(screen.queryByDisplayValue("kisssub")).not.toBeInTheDocument()
  })

  it("does not offer source as an any-clause field", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi()

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "过滤规则" }))
    await user.click(screen.getByRole("button", { name: "新增筛选器" }))
    await user.click(screen.getByRole("button", { name: "添加任一条件" }))

    await user.click(screen.getByLabelText("任一条件字段 1"))

    expect(await screen.findByRole("option", { name: "标题" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "字幕组" })).toBeInTheDocument()
    expect(screen.queryByRole("option", { name: "站点" })).not.toBeInTheDocument()
  })

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

  it("shows the new default concurrency and retry values when saved settings are incomplete", async () => {
    const api = createOptionsApi({
      loadSettings: vi.fn().mockResolvedValue({})
    })

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:7474")).toBeInTheDocument()
    expect(screen.getByLabelText("并发数")).toHaveValue(3)
    expect(screen.getByLabelText("重试次数")).toHaveValue(3)
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
            downloaders: expect.objectContaining({
              qbittorrent: expect.objectContaining({
                username: "operator"
              })
            }),
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
    await waitFor(() => {
      expect(saveButton).toBeDisabled()
    })

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
      let resolveConnection:
        | ((value: {
            downloaderId: "qbittorrent"
            displayName: "qBittorrent"
            baseUrl: string
            version: string
          }) => void)
        | undefined
      const api = createOptionsApi({
        testConnection: vi.fn().mockImplementation(
          () =>
            new Promise<{
              downloaderId: "qbittorrent"
              displayName: "qBittorrent"
              baseUrl: string
              version: string
            }>((resolve) => {
              resolveConnection = resolve
            })
        )
      })

      render(<OptionsPage api={api} />)

      expect(await screen.findByRole("status")).toHaveTextContent("设置已加载。")

      await user.click(screen.getByRole("button", { name: "测试连接" }))

      expect(api.testConnection).toHaveBeenCalledWith(settings)
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "测试连接" })).toBeDisabled()
        expect(screen.getByRole("status")).toHaveTextContent("正在测试连接。")
      })

      resolveConnection?.({
        downloaderId: "qbittorrent",
        displayName: "qBittorrent",
        baseUrl: settings.downloaders.qbittorrent.baseUrl,
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

      await user.click(screen.getByRole("button", { name: "下载器与基础设置" }))

      expect(window.location.hash).toBe("#/general")
      expect(await screen.findByLabelText("用户名")).toHaveValue("testuser")
    },
    15000
  )
})
