import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { OptionsPage, type OptionsApi } from "../../src/components/options/OptionsPage"
import type { BatchExecutionConfig } from "../../src/lib/batch-config/types"
import type { SubscriptionEntry } from "../../src/lib/shared/types"
import type { SourceConfig } from "../../src/lib/sources/config/types"
import type { SubscriptionPolicyConfig } from "../../src/lib/subscriptions/policy/types"
import {
  deleteSubscription,
  resetSubscriptionDb,
  setLastSchedulerRunAt,
  subscriptionDb,
  upsertSubscription
} from "../../src/lib/subscriptions"

const permissionsContainsMock = vi.fn()
const permissionsRequestMock = vi.fn()
const scrollIntoViewMock = vi.fn()

const sendRuntimeRequestMock = vi.hoisted(() => vi.fn())

vi.mock("../../src/lib/shared/messages", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/shared/messages")>(
    "../../src/lib/shared/messages"
  )
  return {
    ...actual,
    sendRuntimeRequest: sendRuntimeRequestMock
  }
})

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
  filters: [],
  subscriptionsEnabled: false,
  pollingIntervalMinutes: 30,
  notificationsEnabled: true
}

const sourceConfig: SourceConfig = {
  kisssub: {
    enabled: true,
    deliveryMode: "magnet",
    script: {
      url: "//1.acgscript.com/script/miobt/4.js?3",
      revision: "20181120.2"
    }
  },
  dongmanhuayuan: {
    enabled: true,
    deliveryMode: "magnet"
  },
  acgrip: {
    enabled: true,
    deliveryMode: "torrent-file"
  },
  bangumimoe: {
    enabled: true,
    deliveryMode: "magnet"
  }
}

import type { DownloaderConfig } from "../../src/lib/downloader/config/types"

const downloaderConfig: DownloaderConfig = {
  activeId: "qbittorrent",
  profiles: {
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
  }
}

const subscriptionPolicy: SubscriptionPolicyConfig = {
  enabled: false,
  pollingIntervalMinutes: 30,
  notificationsEnabled: true
}

const editableSettings = settings
const {
  subscriptionsEnabled: _subscriptionsEnabled,
  pollingIntervalMinutes: _pollingIntervalMinutes,
  notificationsEnabled: _notificationsEnabled,
  ...formEditableSettings
} = editableSettings

function createOptionsApi(overrides: Partial<OptionsApi> = {}): OptionsApi {
  return {
    getFilterConfig: vi.fn().mockResolvedValue({ rules: [] }),
    saveFilterConfig: vi.fn().mockImplementation(async (config) => config),
    getSourceConfig: vi.fn().mockResolvedValue(sourceConfig),
    saveSourceConfig: vi.fn().mockImplementation(async (config) => config),
    getDownloaderConfig: vi.fn().mockResolvedValue(downloaderConfig),
    saveDownloaderConfig: vi.fn().mockImplementation(async (config) => config),
    getBatchExecutionConfig: vi.fn().mockResolvedValue({
      concurrency: 3,
      retryCount: 3,
      injectTimeoutMs: 15000,
      domSettleMs: 1200
    }),
    saveBatchExecutionConfig: vi.fn().mockImplementation(async (config) => config),
    saveGeneralSettings: vi.fn().mockImplementation(async (payload) => payload),
    getBatchUiPreferences: vi.fn().mockResolvedValue({ lastSavePath: "" }),
    saveBatchUiPreferences: vi.fn().mockImplementation(async (preferences) => preferences),
    getSubscriptionPolicy: vi.fn().mockResolvedValue(subscriptionPolicy),
    saveSubscriptionPolicy: vi.fn().mockImplementation(async (config) => config),
    upsertSubscription: vi.fn().mockImplementation(async (subscription) => {
      await upsertSubscription(subscription)
    }),
    deleteSubscription: vi.fn().mockImplementation(async (subscriptionId) => {
      await deleteSubscription(subscriptionId)
    }),
    downloadSubscriptionHits: vi.fn().mockResolvedValue({
      attemptedHits: 1,
      submittedHits: 1,
      duplicateHits: 0,
      failedHits: 0
    }),
    testConnection: vi.fn().mockResolvedValue({
      downloaderId: "qbittorrent",
      displayName: "qBittorrent",
      baseUrl: downloaderConfig.profiles.qbittorrent.baseUrl,
      version: "5.0.0"
    }),
    ...overrides
  }
}

async function seedSubscriptionFixture() {
  const subscription: SubscriptionEntry = {
    id: "sub-1",
    name: "ACG Medalist",
    enabled: true,
    sourceIds: ["acgrip"],
    multiSiteModeEnabled: false,
    titleQuery: "Medalist",
    subgroupQuery: "LoliHouse",
    advanced: {
      must: [],
      any: []
    },
    createdAt: "2026-04-13T00:00:00.000Z",
    baselineCreatedAt: "2026-04-13T00:00:00.000Z",
    deletedAt: null
  }

  await upsertSubscription(subscription)
  await subscriptionDb.subscriptionHits.bulkPut([
    {
      id: "hit-1",
      subscriptionId: "sub-1",
      sourceId: "acgrip",
      title: "[LoliHouse] Medalist - 01 [1080p]",
      normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
      subgroup: "LoliHouse",
      detailUrl: "https://acg.rip/t/100",
      magnetUrl: "magnet:?xt=urn:btih:AAA111",
      torrentUrl: "",
      discoveredAt: "2026-04-14T08:00:00.000Z",
      downloadedAt: null,
      downloadStatus: "idle",
      readAt: null,
      resolvedAt: null
    },
    {
      id: "hit-2",
      subscriptionId: "sub-1",
      sourceId: "acgrip",
      title: "[LoliHouse] Medalist - 02 [1080p]",
      normalizedTitle: "[lolihouse] medalist - 02 [1080p]",
      subgroup: "LoliHouse",
      detailUrl: "https://acg.rip/t/101",
      magnetUrl: "magnet:?xt=urn:btih:AAA222",
      torrentUrl: "",
      discoveredAt: "2026-04-14T10:00:00.000Z",
      downloadedAt: null,
      downloadStatus: "idle",
      readAt: null,
      resolvedAt: null
    },
    {
      id: "hit-3",
      subscriptionId: "sub-1",
      sourceId: "acgrip",
      title: "[LoliHouse] Medalist - 03 [1080p]",
      normalizedTitle: "[lolihouse] medalist - 03 [1080p]",
      subgroup: "LoliHouse",
      detailUrl: "https://acg.rip/t/102",
      magnetUrl: "magnet:?xt=urn:btih:AAA333",
      torrentUrl: "",
      discoveredAt: "2026-04-14T11:00:00.000Z",
      downloadedAt: "2026-04-14T11:30:00.000Z",
      downloadStatus: "submitted",
      readAt: "2026-04-14T11:05:00.000Z",
      resolvedAt: "2026-04-14T11:30:00.000Z"
    }
  ])
  await subscriptionDb.subscriptionRuntime.put({
    subscriptionId: "sub-1",
    lastScanAt: "2026-04-14T09:00:00.000Z",
    lastMatchedAt: "2026-04-14T09:00:00.000Z",
    lastError: "",
    seenFingerprints: ["fp-1"],
    recentHits: [
      {
        id: "hit-1",
        subscriptionId: "sub-1",
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 01 [1080p]",
        normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
        subgroup: "LoliHouse",
        detailUrl: "https://acg.rip/t/100",
        magnetUrl: "magnet:?xt=urn:btih:AAA111",
        torrentUrl: "",
        discoveredAt: "2026-04-14T08:00:00.000Z",
        downloadedAt: null,
        downloadStatus: "idle",
        readAt: null,
        resolvedAt: null
      }
    ]
  })
  await subscriptionDb.notificationRounds.put({
    id: "subscription-round:20260414093000000",
    createdAt: "2026-04-14T09:30:00.000Z",
    hits: [
      {
        id: "hit-1",
        subscriptionId: "sub-1",
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 01 [1080p]",
        normalizedTitle: "[lolihouse] medalist - 01 [1080p]",
        subgroup: "LoliHouse",
        detailUrl: "https://acg.rip/t/100",
        magnetUrl: "magnet:?xt=urn:btih:AAA111",
        torrentUrl: "",
        discoveredAt: "2026-04-14T08:00:00.000Z",
        downloadedAt: null,
        downloadStatus: "idle",
        readAt: null,
        resolvedAt: null
      }
    ]
  })
  await subscriptionDb.notificationRounds.put({
    id: "subscription-round:20260414100000000",
    createdAt: "2026-04-14T10:00:00.000Z",
    hits: [
      {
        id: "hit-2",
        subscriptionId: "sub-1",
        sourceId: "acgrip",
        title: "[LoliHouse] Medalist - 02 [1080p]",
        normalizedTitle: "[lolihouse] medalist - 02 [1080p]",
        subgroup: "LoliHouse",
        detailUrl: "https://acg.rip/t/101",
        magnetUrl: "magnet:?xt=urn:btih:AAA222",
        torrentUrl: "",
        discoveredAt: "2026-04-14T10:00:00.000Z",
        downloadedAt: null,
        downloadStatus: "idle",
        readAt: null,
        resolvedAt: null
      }
    ]
  })
  await setLastSchedulerRunAt("2026-04-14T09:30:00.000Z")
}

function createDeferred<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })

  return {
    promise,
    resolve
  }
}

describe("OptionsPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    scrollIntoViewMock.mockReset()
    await resetSubscriptionDb()
    await setLastSchedulerRunAt(null)
    await subscriptionDb.subscriptionRuntime.clear()
    await subscriptionDb.notificationRounds.clear()
    window.location.hash = ""
    permissionsContainsMock.mockResolvedValue(true)
    permissionsRequestMock.mockResolvedValue(true)
    sendRuntimeRequestMock.mockImplementation((request: { type: string }) => {
      if (request.type === "GET_OVERVIEW_STATE") {
        return Promise.resolve({
          ok: true,
          state: {
            downloaderName: "qBittorrent",
            downloaderBaseUrl: "http://127.0.0.1:17474",
            subscriptionsEnabled: false,
            configuredSubscriptionCount: 0,
            enabledSubscriptionCount: 0
          }
        })
      }
      if (request.type === "GET_HISTORY") {
        return Promise.resolve({
          ok: true,
          records: []
        })
      }
      if (request.type === "GET_HISTORY_PAGE_CONTEXT") {
        return Promise.resolve({
          ok: true,
          context: {
            downloaderConfig: downloaderConfig
          }
        })
      }
      return Promise.resolve({ ok: true })
    })
    const runtimeBrowser = (globalThis as typeof globalThis & {
      browser: {
        permissions: {
          contains: typeof permissionsContainsMock
          request: typeof permissionsRequestMock
        }
      }
    }).browser
    runtimeBrowser.permissions.contains = permissionsContainsMock
    runtimeBrowser.permissions.request = permissionsRequestMock
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
      value: scrollIntoViewMock
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

  it("renders English options chrome when the browser locale is English", async () => {
    ;(globalThis as typeof globalThis & { __animeBtTestLocale?: string }).__animeBtTestLocale = "en"
    const api = createOptionsApi()

    window.location.hash = ""
    render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "Downloader & Basic Settings" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sites" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument()
    expect(screen.getByText("Extension Settings")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "View GitHub Repository" })).toBeInTheDocument()
  })

  it("renders the redesigned general workspace on the default route", async () => {
    const api = createOptionsApi()

    window.location.hash = ""
    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()
    expect(window.location.hash).toBe("#/general")
    expect(screen.getAllByText("Anime BT Batch")).toHaveLength(1)

    const sidebarNav = screen.getByTestId("options-sidebar-groups")
    expect(within(sidebarNav).getAllByRole("button")).toHaveLength(7)
    expect(screen.getByRole("button", { name: "下载器与基础设置" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "站点配置" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "过滤规则" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "订阅" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "订阅命中" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "批次历史" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "源站概览" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "下载器与基础设置" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "下载器选择" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: "qBittorrent" })).toBeChecked()
    expect(screen.getByText("下载器兼容性提示")).toBeInTheDocument()
    expect(screen.getByTestId("options-page-footer")).toBeInTheDocument()
    expect(screen.getByTestId("options-page-footer")).toHaveClass("fixed")
    expect(screen.getByRole("button", { name: "保存基础设置" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "保存下载器设置" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "保存批量执行设置" })).not.toBeInTheDocument()
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
    expect(within(screen.getByTestId("general-downloader-summary-card")).getAllByText("qBittorrent")).toHaveLength(2)
    expect(
      within(screen.getByTestId("general-downloader-summary-card")).getByText("http://127.0.0.1:17474")
    ).toBeInTheDocument()

    await user.click(screen.getByRole("radio", { name: "Transmission" }))

    expect(screen.getByText("当前下载器：Transmission")).toBeInTheDocument()
    expect(within(screen.getByTestId("general-downloader-summary-card")).getAllByText("Transmission")).toHaveLength(2)
    expect(
      within(screen.getByTestId("general-downloader-summary-card")).getByText("http://127.0.0.1:9091/transmission/rpc")
    ).toBeInTheDocument()
  })

  it("shows the persisted current downloader when opening a non-general route directly", async () => {
    const api = createOptionsApi({
      getDownloaderConfig: vi.fn().mockResolvedValue({
        ...downloaderConfig,
        activeId: "transmission"
      })
    })

    window.location.hash = "#/sites"
    render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "站点配置" })).toBeInTheDocument()
    expect(await screen.findByText("当前下载器：Transmission")).toBeInTheDocument()
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
      expect(screen.queryByText("当前已启用 4 / 4 个站点")).not.toBeInTheDocument()
      expect(screen.getByText("Kisssub 爱恋动漫")).toBeInTheDocument()
      expect(screen.getByText("Dongmanhuayuan 动漫花园")).toBeInTheDocument()
      expect(screen.getAllByText("ACG.RIP").length).toBeGreaterThan(0)
      expect(screen.getByText("Bangumi.moe")).toBeInTheDocument()
      expect(screen.getByTestId("options-page-footer")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "保存站点配置" })).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "源站概览" }))

      expect(window.location.hash).toBe("#/overview")
      expect(screen.getByRole("heading", { name: "源站概览" })).toBeInTheDocument()
      expect(screen.getAllByRole("button", { name: "访问站点" })).toHaveLength(4)
      expect(screen.getByText("整合番组表与字幕组的动漫资源站")).toBeInTheDocument()
      expect(screen.getByText("面向动漫爱好者的BT资源交流站")).toBeInTheDocument()
      expect(screen.getByText("分类清晰、以种子直下为主的ACG站")).toBeInTheDocument()
      expect(screen.getByText("追番日历结合最新种子发布的社区")).toBeInTheDocument()
      expect(screen.queryByText("http://127.0.0.1:17474")).not.toBeInTheDocument()
      expect(screen.queryByText("后台轮询")).not.toBeInTheDocument()
      expect(screen.getByText("统一的站点配置页集中管理 4 个受支持站点的启用状态和专属参数。")).toBeInTheDocument()
      expect(screen.getByText("禁用站点后不会注入批量下载 UI，后台批处理也会同步拒绝该站点请求。")).toBeInTheDocument()
      expect(screen.getByText("源站概览保留为独立页面，方便查看站点简介与快速访问。")).toBeInTheDocument()
      expect(screen.queryByTestId("options-page-footer")).not.toBeInTheDocument()
    },
    10000
  )

  it("renders the matching page when opened from a direct route hash", async () => {
    const api = createOptionsApi()

    window.location.hash = "#/sites"
    const firstRender = render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "站点配置" })).toBeInTheDocument()
    expect(screen.queryByText("当前已启用 4 / 4 个站点")).not.toBeInTheDocument()

    firstRender.unmount()
    window.location.hash = "#/filters"
    const secondRender = render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "过滤规则" })).toBeInTheDocument()
    expect(screen.getByText("筛选器")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "新增筛选器" })).toBeInTheDocument()
    expect(screen.getByText("快速测试")).toBeInTheDocument()
    expect(screen.getByText("还没有筛选器")).toBeInTheDocument()

    secondRender.unmount()
    window.location.hash = "#/subscriptions"
    const thirdRender = render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "订阅" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "新增订阅" }).length).toBeGreaterThan(0)
    expect(screen.getByText("还没有订阅规则")).toBeInTheDocument()
    expect(screen.getByTestId("subscriptions-summary-card")).toBeInTheDocument()
    expect(within(screen.getByTestId("subscriptions-summary-card")).getByText("已配置 0 条订阅")).toBeInTheDocument()
    expect(within(screen.getByTestId("subscriptions-summary-card")).getByText("已启用 0 条")).toBeInTheDocument()

    thirdRender.unmount()
    window.location.hash = "#/overview"
    render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "源站概览" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "访问站点" })).toHaveLength(4)
    expect(screen.queryByText("http://127.0.0.1:17474")).not.toBeInTheDocument()
    expect(screen.queryByText("后台轮询")).not.toBeInTheDocument()
  })

  it("renders subscription hits workbench summaries and derives unread idle hits as new", async () => {
    const api = createOptionsApi()

    await seedSubscriptionFixture()
    window.location.hash = "#/subscription-hits"
    render(<OptionsPage api={api} />)

    expect(await screen.findByTestId("subscription-hits-workbench")).toBeInTheDocument()
    expect(await screen.findByTestId("subscription-hit-group-sub-1")).toBeInTheDocument()
    expect(screen.getByTestId("subscription-hit-summary-pending")).toHaveTextContent("2")
    expect(screen.getByTestId("subscription-hit-summary-new")).toHaveTextContent("2")
    expect(screen.getByTestId("subscription-hit-summary-submitted")).toHaveTextContent("1")
    expect(screen.getByTestId("subscription-hit-summary-failed")).toHaveTextContent("0")
    expect(screen.getByTestId("hit-status-hit-2")).toHaveTextContent("新命中")
  })

  it("tracks round changes, marks highlighted hits viewed, and scrolls the first highlighted hit into view", async () => {
    const api = createOptionsApi()

    await seedSubscriptionFixture()
    window.location.hash = "#/subscription-hits?round=subscription-round:20260414093000000"
    render(<OptionsPage api={api} />)

    expect(await screen.findByTestId("subscription-hits-workbench")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId("subscription-hit-row-hit-1")).toHaveAttribute("data-highlighted", "true")
    })
    await waitFor(async () => {
      expect((await subscriptionDb.subscriptionHits.get("hit-1"))?.readAt).not.toBeNull()
    })
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled()
    })

    window.location.hash = "#/subscription-hits?round=subscription-round:20260414100000000"
    window.dispatchEvent(new HashChangeEvent("hashchange"))

    await waitFor(() => {
      expect(screen.getByTestId("subscription-hit-row-hit-2")).toHaveAttribute("data-highlighted", "true")
    })
    await waitFor(async () => {
      expect((await subscriptionDb.subscriptionHits.get("hit-2"))?.readAt).not.toBeNull()
    })
  })

  it("passes current round context when downloading from a highlighted workbench view", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi()

    await seedSubscriptionFixture()
    window.location.hash = "#/subscription-hits?round=subscription-round:20260414093000000"
    render(<OptionsPage api={api} />)

    expect(await screen.findByTestId("subscription-hits-workbench")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId("subscription-hit-row-hit-1")).toHaveAttribute("data-highlighted", "true")
    })

    await user.click(
      within(screen.getByTestId("subscription-hit-row-hit-1")).getByRole("button", {
        name: "下载 [LoliHouse] Medalist - 01 [1080p]"
      })
    )

    await waitFor(() => {
      expect(api.downloadSubscriptionHits).toHaveBeenCalledWith({
        hitIds: ["hit-1"],
        roundId: "subscription-round:20260414093000000"
      })
    })
  })

  it(
    "saves filter config via the dedicated save button",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi({
        saveFilterConfig: vi.fn().mockImplementation(async (config) => config)
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

      await user.click(screen.getByRole("button", { name: "保存筛选器配置" }))

      await waitFor(() => {
        expect(api.saveFilterConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            rules: expect.arrayContaining([
              expect.objectContaining({
                name: "爱恋 1080 简繁",
                sourceIds: ["kisssub", "dongmanhuayuan", "acgrip", "bangumimoe"],
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

  it(
    "creates a subscription from the subscriptions workspace without calling app-settings save",
    async () => {
      const user = userEvent.setup()
      await setLastSchedulerRunAt("2026-04-14T09:30:00.000Z")
      const api = createOptionsApi()

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "订阅" }))

      expect(screen.getByText("上次调度运行")).toBeInTheDocument()
      await screen.findByText("2026-04-14 17:30")

      await user.click(screen.getAllByRole("button", { name: "新增订阅" })[0])

      expect(await screen.findByRole("dialog", { name: "新增订阅" })).toBeInTheDocument()
      expect(screen.queryByTestId("subscription-source-tag-kisssub")).not.toBeInTheDocument()
      expect(screen.queryByTestId("subscription-source-tag-dongmanhuayuan")).not.toBeInTheDocument()
      await user.type(screen.getByLabelText("订阅名称"), "ACG Medalist")
      await user.type(screen.getByLabelText("标题关键词"), "Medalist")
      await user.type(screen.getByLabelText("字幕组关键词"), "LoliHouse")
      await user.click(screen.getByRole("button", { name: "保存订阅" }))

      await waitFor(() => {
        expect(api.upsertSubscription).toHaveBeenCalledTimes(1)
      })
      expect(api.upsertSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "ACG Medalist",
          titleQuery: "Medalist",
          subgroupQuery: "LoliHouse"
        })
      )
    },
    10000
  )

  it("keeps the subscription editor open when async persistence fails", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi({
      upsertSubscription: vi.fn().mockRejectedValue(new Error("save failed"))
    })

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "订阅" }))
    await user.click(screen.getAllByRole("button", { name: "新增订阅" })[0])

    expect(await screen.findByRole("dialog", { name: "新增订阅" })).toBeInTheDocument()
    await user.type(screen.getByLabelText("订阅名称"), "ACG Medalist")
    await user.type(screen.getByLabelText("标题关键词"), "Medalist")
    await user.click(screen.getByRole("button", { name: "保存订阅" }))

      expect(await screen.findByRole("dialog", { name: "新增订阅" })).toBeInTheDocument()
      expect(
        within(screen.getByRole("dialog", { name: "新增订阅" })).getByText("save failed")
      ).toBeInTheDocument()
  })

  it("disables subscription global controls until the dedicated settings load resolves", async () => {
    const deferred = createDeferred<typeof subscriptionPolicy>()
    const api = createOptionsApi({
      getSubscriptionPolicy: vi.fn().mockReturnValue(deferred.promise)
    })

    window.location.hash = "#/subscriptions"
    render(<OptionsPage api={api} />)

    expect(await screen.findByRole("heading", { name: "订阅" })).toBeInTheDocument()

    expect(screen.getByRole("button", { name: "保存订阅设置" })).toBeDisabled()
    expect(screen.getByRole("switch", { name: "启用后台订阅轮询" })).toBeDisabled()
    expect(screen.getByRole("spinbutton", { name: "轮询间隔（分钟）" })).toBeDisabled()

    deferred.resolve(subscriptionPolicy)

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "保存订阅设置" })).not.toBeDisabled()
    })
  })

  it("clamps the subscription polling interval before save and syncs the input value", async () => {
    const user = userEvent.setup()
    const saveSubscriptionPolicy = vi.fn().mockImplementation(async (config) => config)
    const api = createOptionsApi({
      saveSubscriptionPolicy
    })

    window.location.hash = "#/subscriptions"
    render(<OptionsPage api={api} />)

    const pollingIntervalInput = await screen.findByRole("spinbutton", {
      name: "轮询间隔（分钟）"
    })
    fireEvent.change(pollingIntervalInput, {
      target: {
        value: "200"
      }
    })

    expect(pollingIntervalInput).toHaveValue(200)

    await user.click(screen.getByRole("button", { name: "保存订阅设置" }))

    await waitFor(() => {
      expect(saveSubscriptionPolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          pollingIntervalMinutes: 120
        })
      )
    })
    expect(screen.getByRole("spinbutton", { name: "轮询间隔（分钟）" })).toHaveValue(120)
  })

  it(
    "manages Bangumi.moe subscription with the current subscription fields only",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi()

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "订阅" }))
      await user.click(screen.getAllByRole("button", { name: "新增订阅" })[0])

      expect(await screen.findByRole("dialog", { name: "新增订阅" })).toBeInTheDocument()
      await user.type(screen.getByLabelText("订阅名称"), "Bangumi Medalist")
      await user.type(screen.getByLabelText("标题关键词"), "Medalist")
      await user.click(screen.getByTestId("subscription-source-tag-bangumimoe"))

      await user.click(screen.getByRole("button", { name: "保存订阅" }))

      const savedSubscription = vi.mocked(api.upsertSubscription).mock.calls[0]?.[0]
      expect(Object.keys(savedSubscription ?? {}).sort()).toEqual([
        "advanced",
        "baselineCreatedAt",
        "createdAt",
        "deletedAt",
        "enabled",
        "id",
        "multiSiteModeEnabled",
        "name",
        "sourceIds",
        "subgroupQuery",
        "titleQuery"
      ])
      expect(savedSubscription).toEqual(expect.objectContaining({
        name: "Bangumi Medalist",
        sourceIds: ["bangumimoe"],
        titleQuery: "Medalist",
        deletedAt: null
      }))
    },
    10000
  )

  it(
    "keeps subscription domain saves independent from other settings domains",
    async () => {
      const user = userEvent.setup()
      await seedSubscriptionFixture()
      const api = createOptionsApi()

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "订阅" }))
      await screen.findByTestId("subscription-card-sub-1")
      await user.click(
        within(screen.getByTestId("subscription-card-sub-1")).getByRole("button", {
          name: "编辑"
        })
      )

      expect(await screen.findByRole("dialog", { name: "编辑订阅" })).toBeInTheDocument()
      const titleQueryInput = screen.getByLabelText("标题关键词")
      await user.clear(titleQueryInput)
      await user.type(titleQueryInput, "Bang Dream")
      await user.click(screen.getByRole("button", { name: "保存订阅" }))

      expect(api.upsertSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "sub-1",
          titleQuery: "Bang Dream"
        })
      )
    },
    10000
  )

  it("formats subscription source summaries in English without Chinese separators", async () => {
    const user = userEvent.setup()
    ;(globalThis as typeof globalThis & { __animeBtTestLocale?: string }).__animeBtTestLocale = "en"
    const api = createOptionsApi()

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Subscriptions" }))
    await user.click(screen.getAllByRole("button", { name: "Add subscription" })[0])

    expect(await screen.findByRole("dialog", { name: "Add subscription" })).toBeInTheDocument()
    await user.type(screen.getByLabelText("Subscription name"), "ACG + Bangumi")
    await user.type(screen.getByLabelText("Title query"), "Medalist")
    await user.click(screen.getByRole("switch", { name: "Allow multiple sites" }))
    await user.click(screen.getByTestId("subscription-source-tag-bangumimoe"))
    await user.click(screen.getByRole("button", { name: "Save subscription" }))

    const subscriptionCard = await screen.findByTestId(/subscription-card-/)
    expect(within(subscriptionCard).getByText("ACG.RIP and Bangumi.moe")).toBeInTheDocument()
    expect(within(subscriptionCard).queryByText("ACG.RIP、Bangumi.moe")).not.toBeInTheDocument()
  })

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

  it("shows site tags as a separate multi-select section with all sites selected by default", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi()

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "过滤规则" }))
    await user.click(screen.getByRole("button", { name: "新增筛选器" }))

    expect(screen.getByText("适用站点")).toBeInTheDocument()
    expect(screen.getByTestId("filter-source-tag-kisssub")).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByTestId("filter-source-tag-dongmanhuayuan")).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByTestId("filter-source-tag-acgrip")).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByTestId("filter-source-tag-bangumimoe")).toHaveAttribute("aria-pressed", "true")

    await user.click(screen.getByTestId("filter-source-tag-acgrip"))

    expect(screen.getByTestId("filter-source-tag-acgrip")).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByText("已选 3 个站点")).toBeInTheDocument()
  })

  it("does not allow deselecting the last remaining source tag", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi()

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "过滤规则" }))
    await user.click(screen.getByRole("button", { name: "新增筛选器" }))

    await user.click(screen.getByTestId("filter-source-tag-dongmanhuayuan"))
    await user.click(screen.getByTestId("filter-source-tag-acgrip"))
    await user.click(screen.getByTestId("filter-source-tag-bangumimoe"))

    expect(screen.getByText("已选 1 个站点")).toBeInTheDocument()

    await user.click(screen.getByTestId("filter-source-tag-kisssub"))

    expect(screen.getByTestId("filter-source-tag-kisssub")).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("至少选择一个适用站点")).toBeInTheDocument()
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
      getBatchExecutionConfig: vi.fn().mockResolvedValue({
        concurrency: 3,
        retryCount: 3,
        injectTimeoutMs: 15000,
        domSettleMs: 500
      })
    })

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()
    expect(screen.getByLabelText("并发数")).toHaveValue(3)
    expect(screen.getByLabelText("重试次数")).toHaveValue(3)
  })


  it(
    "saves edited values through domain-specific save buttons",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi({
        saveGeneralSettings: vi.fn().mockImplementation(async (payload) => payload),
        saveSourceConfig: vi.fn().mockImplementation(async (config) => config)
      })

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

      const usernameField = screen.getByLabelText("用户名")
      await user.clear(usernameField)
      await user.type(usernameField, "operator")

      // Save general config with the unified footer button
      await user.click(screen.getByRole("button", { name: "保存基础设置" }))

      await waitFor(() => {
        expect(api.saveGeneralSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            downloaderConfig: expect.objectContaining({
              profiles: expect.objectContaining({
                qbittorrent: expect.objectContaining({
                  username: "operator"
                })
              })
            }),
            batchExecutionConfig: expect.any(Object)
          })
        )
      })

      // Now navigate to sites and edit site settings
      await user.click(screen.getByRole("button", { name: "站点配置" }))

      const kisssubCard = screen.getByTestId("site-card-kisssub")
      const revisionField = within(kisssubCard).getByLabelText("Kisssub 脚本版本号")
      await user.clear(revisionField)
      await user.type(revisionField, "20260324.1")

      const acgripCard = screen.getByTestId("site-card-acgrip")
      await user.click(within(acgripCard).getByRole("radio", { name: "直接提交种子链接" }))

      await user.click(screen.getByRole("switch", { name: "Bangumi.moe 启用开关" }))

      // Save site config with the dedicated button
      await user.click(screen.getByRole("button", { name: "保存站点配置" }))

      await waitFor(() => {
        expect(api.saveSourceConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            kisssub: expect.objectContaining({
              script: expect.objectContaining({
                revision: "20260324.1"
              })
            }),
            acgrip: expect.objectContaining({
              deliveryMode: "torrent-url"
            }),
            bangumimoe: expect.objectContaining({
              enabled: false
            })
          })
        )
      })

      expect(screen.getByRole("status")).toHaveTextContent("设置已保存。")
    },
    20000
  )

  it("disables the general save button while persisting settings", async () => {
    const user = userEvent.setup()
    let resolveSave:
      | ((value: {
          downloaderConfig: DownloaderConfig
          batchExecutionConfig: BatchExecutionConfig
        }) => void)
      | undefined
    const api = createOptionsApi({
      saveGeneralSettings: vi.fn().mockImplementation(
        () =>
          new Promise<{
            downloaderConfig: DownloaderConfig
            batchExecutionConfig: BatchExecutionConfig
          }>((resolve) => {
            resolveSave = resolve
          })
      )
    })

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    const saveButton = screen.getByRole("button", { name: "保存基础设置" })
    expect(saveButton).not.toBeDisabled()

    await user.click(saveButton)

    expect(api.saveGeneralSettings).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(saveButton).toBeDisabled()
    })

    resolveSave?.({
      downloaderConfig,
      batchExecutionConfig: {
        concurrency: 3,
        retryCount: 3,
        injectTimeoutMs: 15000,
        domSettleMs: 1200
      }
    })

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled()
    })
  })

  it("does not trigger the legacy independent general-setting saves from the unified button", async () => {
    const user = userEvent.setup()
    const api = createOptionsApi({
      saveGeneralSettings: vi.fn().mockRejectedValue(new Error("general save failed"))
    })

    render(<OptionsPage api={api} />)

    expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

    await user.clear(screen.getByLabelText("并发数"))
    await user.type(screen.getByLabelText("并发数"), "5")
    await user.click(screen.getByRole("button", { name: "保存基础设置" }))

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("基础设置中有配置项保存失败，请重试。")
    })

    expect(api.saveGeneralSettings).toHaveBeenCalledTimes(1)
    expect(api.saveDownloaderConfig).not.toHaveBeenCalled()
    expect(api.saveBatchExecutionConfig).not.toHaveBeenCalled()
  })

  it(
    "preserves site-specific settings when a site is disabled and then enabled again",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi({
        saveSourceConfig: vi.fn().mockImplementation(async (config) => config)
      })

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "站点配置" }))

      // Wait for site config to load
      await screen.findByTestId("sites-workbench")

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

      // Save with the dedicated site config button
      await user.click(screen.getByRole("button", { name: "保存站点配置" }))

      await waitFor(() => {
        expect(api.saveSourceConfig).toHaveBeenCalledWith(
          expect.objectContaining({
            kisssub: expect.objectContaining({
              script: expect.objectContaining({
                revision: "20260324.1"
              }),
              deliveryMode: "torrent-file",
              enabled: true
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

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("设置已加载。")
      })

      await user.click(screen.getByRole("button", { name: "测试连接" }))

      expect(api.testConnection).toHaveBeenCalledWith(downloaderConfig)
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

  it(
    "requests downloader host permission from the options page before testing the connection",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi()

      permissionsContainsMock.mockResolvedValueOnce(false)

      render(<OptionsPage api={api} />)

      await screen.findByText("设置已加载。")

      await user.click(screen.getByRole("button", { name: "测试连接" }))

      expect(permissionsContainsMock).toHaveBeenCalledWith({
        origins: ["http://127.0.0.1/*"]
      })
      expect(permissionsRequestMock).toHaveBeenCalledWith({
        origins: ["http://127.0.0.1/*"]
      })
      expect(api.testConnection).toHaveBeenCalledWith(downloaderConfig)
    },
    10000
  )

  it(
    "surfaces a permission error and skips the connection probe when the user denies host access",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi()

      permissionsContainsMock.mockResolvedValueOnce(false)
      permissionsRequestMock.mockResolvedValueOnce(false)

      render(<OptionsPage api={api} />)

      await screen.findByText("设置已加载。")

      await user.click(screen.getByRole("button", { name: "测试连接" }))

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveTextContent("权限")
      })
      expect(api.testConnection).not.toHaveBeenCalled()
    },
    10000
  )

  it(
    "tests the active downloader even when the inactive downloader address is blank",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi({
        testConnection: vi.fn().mockResolvedValue({
          downloaderId: "qbittorrent",
          displayName: "qBittorrent",
          baseUrl: settings.downloaders.qbittorrent.baseUrl,
          version: "5.0.0"
        })
      })

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

      await user.click(screen.getByRole("radio", { name: "Transmission" }))
      const transmissionBaseUrlField = await screen.findByPlaceholderText(
        "http://127.0.0.1:9091/transmission/rpc"
      )
      await user.clear(transmissionBaseUrlField)
      expect(transmissionBaseUrlField).toHaveValue("")

      await user.click(screen.getByRole("radio", { name: "qBittorrent" }))
      await user.click(screen.getByRole("button", { name: "测试连接" }))

      await waitFor(() => {
        expect(api.testConnection).toHaveBeenCalledWith({
          ...downloaderConfig,
          activeId: "qbittorrent",
          profiles: {
            ...downloaderConfig.profiles,
            transmission: {
              ...downloaderConfig.profiles.transmission,
              baseUrl: ""
            }
          }
        })
      })

      expect(screen.getByRole("status")).not.toHaveTextContent("请先修正表单中的错误。")
    },
    10000
  )

  it(
    "saves the active downloader while leaving an inactive downloader address blank",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi({
        saveGeneralSettings: vi.fn().mockImplementation(async (payload) => payload)
      })

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

      await user.click(screen.getByRole("radio", { name: "Transmission" }))
      const transmissionBaseUrlField = await screen.findByPlaceholderText(
        "http://127.0.0.1:9091/transmission/rpc"
      )
      await user.clear(transmissionBaseUrlField)
      expect(transmissionBaseUrlField).toHaveValue("")

      await user.click(screen.getByRole("radio", { name: "qBittorrent" }))
      await user.click(screen.getByRole("button", { name: "保存基础设置" }))

      await waitFor(() => {
        expect(api.saveGeneralSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            downloaderConfig: expect.objectContaining({
              activeId: "qbittorrent",
              profiles: expect.objectContaining({
                transmission: expect.objectContaining({
                  baseUrl: ""
                })
              })
            }),
            batchExecutionConfig: expect.any(Object)
          })
        )
      })
    },
    10000
  )

  it(
    "clears the displayed connection result when switching downloaders",
    async () => {
      const user = userEvent.setup()
      const api = createOptionsApi()

      render(<OptionsPage api={api} />)

      expect(await screen.findByDisplayValue("http://127.0.0.1:17474")).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "测试连接" }))

      expect(
        await screen.findByText(/已连接到 qBittorrent（http:\/\/127.0.0.1:17474）。/)
      ).toBeInTheDocument()

      await user.click(screen.getByRole("radio", { name: "Transmission" }))

      expect(screen.queryByText(/已连接到 qBittorrent/)).not.toBeInTheDocument()
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
