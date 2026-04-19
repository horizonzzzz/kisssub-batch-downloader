import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RuntimeRequest, RuntimeResponse } from "../../src/lib/shared/messages"
import type { PopupStateViewModel } from "../../src/lib/shared/popup"

const { sendRuntimeRequestMock } = vi.hoisted(() => ({
  sendRuntimeRequestMock: vi.fn()
}))

vi.mock("../../src/lib/shared/messages", async () => {
  const actual = await vi.importActual<typeof import("../../src/lib/shared/messages")>(
    "../../src/lib/shared/messages"
  )

  return {
    ...actual,
    sendRuntimeRequest: sendRuntimeRequestMock
  }
})

import { PopupContainer } from "../../src/components/popup/PopupContainer"

function createState(overrides: Partial<PopupStateViewModel> = {}): PopupStateViewModel {
  return {
    downloaderConnectionStatus: "ready",
    currentDownloaderId: "qbittorrent",
    currentDownloaderName: "qBittorrent",
    activeTab: {
      url: "https://kisssub.org/",
      sourceId: "kisssub",
      supported: true,
      enabled: true,
      batchRunning: false
    },
    supportedSites: [
      {
        id: "kisssub",
        label: "Kisssub",
        displayName: "Kisssub 爱恋动漫",
        url: "kisssub.org",
        enabled: true
      },
      {
        id: "dongmanhuayuan",
        label: "Dongmanhuayuan",
        displayName: "Dongmanhuayuan 动漫花园",
        url: "dongmanhuayuan.com",
        enabled: true
      },
      {
        id: "acgrip",
        label: "ACG.RIP",
        displayName: "ACG.RIP",
        url: "acg.rip",
        enabled: false
      },
      {
        id: "bangumimoe",
        label: "Bangumi.moe",
        displayName: "Bangumi.moe",
        url: "bangumi.moe",
        enabled: true
      }
    ],
    version: "1.4.0",
    helpUrl: "https://github.com/horizonzzzz/anime-bt-batch-downloader",
    ...overrides
  }
}

function okResponse<T extends RuntimeResponse>(response: T): Promise<T> {
  return Promise.resolve(response)
}

function createDeferred<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((r) => {
    resolve = r
  })

  return { promise, resolve }
}

describe("PopupContainer", () => {
  beforeEach(() => {
    sendRuntimeRequestMock.mockReset()
  })

  it("tests downloader connection with the generic runtime message while checking state", async () => {
    const deferred = createDeferred<RuntimeResponse>()

    sendRuntimeRequestMock.mockImplementation((request: RuntimeRequest) => {
      if (request.type === "GET_POPUP_STATE") {
        return okResponse({
          ok: true,
          state: createState({
            downloaderConnectionStatus: "checking"
          })
        })
      }
      if (request.type === "TEST_DOWNLOADER_CONNECTION") {
        return deferred.promise
      }

      return okResponse({ ok: true })
    })

    render(<PopupContainer />)

    await waitFor(() => {
      expect(sendRuntimeRequestMock).toHaveBeenCalledWith({
        type: "TEST_DOWNLOADER_CONNECTION"
      })
    })

    deferred.resolve({ ok: true, result: { downloaderId: "qbittorrent", displayName: "qBittorrent", baseUrl: "http://127.0.0.1:7474", version: "5.0.0" } })

    await waitFor(() => {
      expect(screen.getByText("插件已就绪")).toBeInTheDocument()
    })
  })

  it("loads popup state on mount and renders popup page", async () => {
    sendRuntimeRequestMock.mockImplementation((request: RuntimeRequest) => {
      if (request.type === "GET_POPUP_STATE") {
        return okResponse({
          ok: true,
          state: createState()
        })
      }

      return okResponse({ ok: true })
    })

    render(<PopupContainer />)

    await waitFor(() => {
      expect(screen.getByText("插件已就绪")).toBeInTheDocument()
    })
    expect(sendRuntimeRequestMock).toHaveBeenCalledWith({
      type: "GET_POPUP_STATE"
    })
  })

  it("shows retryable error on initial load failure and retries successfully", async () => {
    sendRuntimeRequestMock
      .mockResolvedValueOnce({ ok: false, error: "加载失败" })
      .mockResolvedValueOnce({
        ok: true,
        state: createState()
      })

    const user = userEvent.setup()
    render(<PopupContainer />)

    await waitFor(() => {
      expect(screen.getByText("加载失败")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("button", { name: "重试" }))

    await waitFor(() => {
      expect(screen.getByText("插件已就绪")).toBeInTheDocument()
    })
    expect(sendRuntimeRequestMock).toHaveBeenNthCalledWith(1, {
      type: "GET_POPUP_STATE"
    })
    expect(sendRuntimeRequestMock).toHaveBeenNthCalledWith(2, {
      type: "GET_POPUP_STATE"
    })
  })

  it("opens general options from header action with /general route", async () => {
    const user = userEvent.setup()
    sendRuntimeRequestMock.mockImplementation((request: RuntimeRequest) => {
      if (request.type === "GET_POPUP_STATE") {
        return okResponse({
          ok: true,
          state: createState()
        })
      }
      if (request.type === "OPEN_OPTIONS_PAGE") {
        return okResponse({ ok: true })
      }

      return okResponse({ ok: true })
    })

    render(<PopupContainer />)
    await screen.findByText("插件已就绪")

    await user.click(screen.getByRole("button", { name: "打开设置" }))

    expect(sendRuntimeRequestMock).toHaveBeenCalledWith({
      type: "OPEN_OPTIONS_PAGE",
      route: "/general"
    })
  })

  it("opens history and filters options routes from quick actions", async () => {
    const user = userEvent.setup()
    sendRuntimeRequestMock.mockImplementation((request: RuntimeRequest) => {
      if (request.type === "GET_POPUP_STATE") {
        return okResponse({
          ok: true,
          state: createState()
        })
      }
      if (request.type === "OPEN_OPTIONS_PAGE") {
        return okResponse({ ok: true })
      }

      return okResponse({ ok: true })
    })

    render(<PopupContainer />)
    await screen.findByText("插件已就绪")

    await user.click(screen.getByRole("button", { name: "批次历史" }))
    await user.click(screen.getByRole("button", { name: "过滤规则" }))

    expect(sendRuntimeRequestMock).toHaveBeenCalledWith({
      type: "OPEN_OPTIONS_PAGE",
      route: "/history"
    })
    expect(sendRuntimeRequestMock).toHaveBeenCalledWith({
      type: "OPEN_OPTIONS_PAGE",
      route: "/filters"
    })
  })

  it("toggles current-site enabled state and refreshes popup state", async () => {
    const user = userEvent.setup()
    sendRuntimeRequestMock
      .mockResolvedValueOnce({
        ok: true,
        state: createState()
      })
      .mockResolvedValueOnce({
        ok: true,
        sourceId: "kisssub",
        enabled: false
      })
      .mockResolvedValueOnce({
        ok: true,
        state: createState({
          activeTab: {
            url: "https://kisssub.org/",
            sourceId: "kisssub",
            supported: true,
            enabled: false,
            batchRunning: false
          }
        })
      })

    render(<PopupContainer />)
    await screen.findByText("插件已就绪")

    await user.click(screen.getByRole("switch", { name: "当前站点启用开关" }))

    expect(sendRuntimeRequestMock).toHaveBeenNthCalledWith(2, {
      type: "SET_SOURCE_ENABLED",
      sourceId: "kisssub",
      enabled: false
    })
    expect(sendRuntimeRequestMock).toHaveBeenNthCalledWith(3, {
      type: "GET_POPUP_STATE"
    })
    await waitFor(() => {
      expect(screen.getByText("当前站点已关闭")).toBeInTheDocument()
      expect(screen.getByRole("switch", { name: "当前站点启用开关" })).not.toBeChecked()
    })
  })

  it("keeps the current-site switch disabled while the active tab batch is running", async () => {
    const user = userEvent.setup()

    sendRuntimeRequestMock.mockImplementation((request: RuntimeRequest) => {
      if (request.type === "GET_POPUP_STATE") {
        return okResponse({
          ok: true,
          state: createState({
            activeTab: {
              url: "https://kisssub.org/",
              sourceId: "kisssub",
              supported: true,
              enabled: true,
              batchRunning: true
            }
          })
        })
      }

      return okResponse({ ok: true })
    })

    render(<PopupContainer />)
    await screen.findByText("插件已就绪")

    const switchControl = screen.getByRole("switch", { name: "当前站点启用开关" })
    expect(switchControl).toBeDisabled()
    expect(screen.getByText("当前批次任务进行中，需等待完成后才能关闭站点。")).toBeInTheDocument()

    await user.click(switchControl)

    expect(sendRuntimeRequestMock).toHaveBeenCalledTimes(1)
  })

  it("surfaces runtime action failures in the popup", async () => {
    const user = userEvent.setup()
    sendRuntimeRequestMock
      .mockResolvedValueOnce({
        ok: true,
        state: createState()
      })
      .mockResolvedValueOnce({
        ok: false,
        error: "打开过滤规则失败"
      })
      .mockResolvedValueOnce({
        ok: false,
        error: "站点状态保存失败"
      })

    render(<PopupContainer />)
    await screen.findByText("插件已就绪")

    await user.click(screen.getByRole("button", { name: "过滤规则" }))
    await waitFor(() => {
      expect(screen.getByText("打开过滤规则失败")).toBeInTheDocument()
    })

    await user.click(screen.getByRole("switch", { name: "当前站点启用开关" }))
    await waitFor(() => {
      expect(screen.getByText("站点状态保存失败")).toBeInTheDocument()
    })
  })

  it("keeps toggled enabled state when save succeeds but refresh fails", async () => {
    const user = userEvent.setup()
    sendRuntimeRequestMock
      .mockResolvedValueOnce({
        ok: true,
        state: createState({
          activeTab: {
            url: "https://kisssub.org/",
            sourceId: "kisssub",
            supported: true,
            enabled: true,
            batchRunning: false
          }
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        sourceId: "kisssub",
        enabled: false
      })
      .mockResolvedValueOnce({
        ok: false,
        error: "刷新失败"
      })

    render(<PopupContainer />)
    await screen.findByText("插件已就绪")

    await user.click(screen.getByRole("switch", { name: "当前站点启用开关" }))

    await waitFor(() => {
      expect(screen.getByText("当前站点已关闭")).toBeInTheDocument()
      expect(screen.getByRole("switch", { name: "当前站点启用开关" })).not.toBeChecked()
    })
    expect(screen.queryByText("刷新失败")).not.toBeInTheDocument()
  })

  it("disables popup actions while route-open request is in flight", async () => {
    const user = userEvent.setup()
    const routeRequest = createDeferred<RuntimeResponse>()

    sendRuntimeRequestMock.mockImplementation((request: RuntimeRequest) => {
      if (request.type === "GET_POPUP_STATE") {
        return okResponse({
          ok: true,
          state: createState()
        })
      }
      if (request.type === "OPEN_OPTIONS_PAGE") {
        return routeRequest.promise
      }

      return okResponse({ ok: true })
    })

    render(<PopupContainer />)
    await screen.findByText("插件已就绪")

    await user.click(screen.getByRole("button", { name: "过滤规则" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "打开设置" })).toBeDisabled()
      expect(screen.getByRole("button", { name: "批次历史" })).toBeDisabled()
      expect(screen.getByRole("button", { name: "过滤规则" })).toBeDisabled()
      expect(screen.getByRole("switch", { name: "当前站点启用开关" })).toBeDisabled()
    })

    await user.click(screen.getByRole("button", { name: "批次历史" }))
    expect(sendRuntimeRequestMock).toHaveBeenCalledTimes(2)

    routeRequest.resolve({ ok: true })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "过滤规则" })).toBeEnabled()
    })
  })

  it("checks qB connectivity for supported enabled tabs and promotes the popup to ready", async () => {
    const connectionRequest = createDeferred<RuntimeResponse>()

    sendRuntimeRequestMock.mockImplementation((request: RuntimeRequest) => {
      if (request.type === "GET_POPUP_STATE") {
        return okResponse({
          ok: true,
          state: createState({
            downloaderConnectionStatus: "checking"
          })
        })
      }
      if (request.type === "TEST_DOWNLOADER_CONNECTION") {
        return connectionRequest.promise
      }

      return okResponse({ ok: true })
    })

    render(<PopupContainer />)

    await waitFor(() => {
      expect(screen.getByText("正在检测下载器连接")).toBeInTheDocument()
    })
    expect(sendRuntimeRequestMock).toHaveBeenNthCalledWith(2, {
      type: "TEST_DOWNLOADER_CONNECTION"
    })

    connectionRequest.resolve({
      ok: true,
      result: {
        downloaderId: "qbittorrent",
        displayName: "qBittorrent",
        baseUrl: "http://127.0.0.1:17474",
        version: "5.0.4"
      }
    })

    await waitFor(() => {
      expect(screen.getByText("插件已就绪")).toBeInTheDocument()
    })
  })

  it("shows a connection-failed card when the popup qB probe fails", async () => {
    sendRuntimeRequestMock.mockImplementation((request: RuntimeRequest) => {
      if (request.type === "GET_POPUP_STATE") {
        return okResponse({
          ok: true,
          state: createState({
            downloaderConnectionStatus: "checking"
          })
        })
      }
      if (request.type === "TEST_DOWNLOADER_CONNECTION") {
        return okResponse({
          ok: false,
          error: "qB 连接失败"
        })
      }

      return okResponse({ ok: true })
    })

    render(<PopupContainer />)

    await waitFor(() => {
      expect(screen.getByText("下载器连接失败")).toBeInTheDocument()
    })
  })
})
