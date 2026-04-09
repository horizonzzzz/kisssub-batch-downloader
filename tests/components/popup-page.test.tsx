import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"

import { PopupPage } from "../../src/components/popup/PopupPage"
import type { PopupStateViewModel } from "../../src/lib/shared/popup"

type PopupPageProps = ComponentProps<typeof PopupPage>
type RuntimeI18n = {
  getMessage: (messageName: string, substitutions?: string | string[]) => string
  getUILanguage?: () => string
}

function createState(overrides: Partial<PopupStateViewModel> = {}): PopupStateViewModel {
  return {
    downloaderConnectionStatus: "idle",
    currentDownloaderId: "qbittorrent",
    currentDownloaderName: "qBittorrent",
    activeTab: {
      url: null,
      sourceId: null,
      supported: false,
      enabled: false,
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
    version: "1.2.3",
    helpUrl: "https://example.com/help",
    ...overrides
  }
}

function renderPopup(overrides: Partial<PopupPageProps> = {}) {
  const onOpenGeneralOptions = vi.fn()
  const onOpenOptionsRoute = vi.fn()
  const onToggleCurrentSiteEnabled = vi.fn()
  const props: PopupPageProps = {
    state: createState(),
    onOpenGeneralOptions,
    onOpenOptionsRoute,
    onToggleCurrentSiteEnabled,
    ...overrides
  }

  return {
    ...render(<PopupPage {...props} />),
    onOpenGeneralOptions,
    onOpenOptionsRoute,
    onToggleCurrentSiteEnabled
  }
}

function installI18nStub(messages: Record<string, string>, locale = "en") {
  const i18n: RuntimeI18n = {
    getMessage: (messageName) => messages[messageName] ?? messageName,
    getUILanguage: () => locale
  }

  Object.defineProperty(globalThis.chrome, "i18n", {
    configurable: true,
    value: i18n
  })
  Object.defineProperty((globalThis as typeof globalThis & { browser: object }).browser, "i18n", {
    configurable: true,
    value: i18n
  })
}

describe("PopupPage", () => {
  it("renders unsupported state and still shows quick actions when the current downloader has not been verified", () => {
    renderPopup()

    expect(screen.getByText("当前页面暂不支持批量下载")).toBeInTheDocument()
    expect(screen.queryByText("未配置 qBittorrent")).not.toBeInTheDocument()
    expect(screen.getByText("一键发送到当前下载器")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "批次历史" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "过滤规则" })).toBeInTheDocument()
  })

  it("renders configured + supported state with current-site toggle and quick actions", () => {
    renderPopup({
      state: createState({
        downloaderConnectionStatus: "ready",
        activeTab: {
          url: "https://kisssub.org/",
          sourceId: "kisssub",
          supported: true,
          enabled: true,
          batchRunning: false
        }
      })
    })

    expect(screen.getByText("插件已就绪")).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: "当前站点启用开关" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "批次历史" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "过滤规则" })).toBeInTheDocument()
  })

  it("renders a disabled-state card when the current supported site is turned off", () => {
    renderPopup({
      state: createState({
        downloaderConnectionStatus: "idle",
        activeTab: {
          url: "https://kisssub.org/",
          sourceId: "kisssub",
          supported: true,
          enabled: false,
          batchRunning: false
        }
      })
    })

    expect(screen.getByText("当前站点已关闭")).toBeInTheDocument()
    expect(screen.getByText(/重新开启后，页面右下角的批量下载面板和勾选框才会出现/)).toBeInTheDocument()
    expect(screen.queryByText("插件已就绪")).not.toBeInTheDocument()
    expect(screen.getByRole("switch", { name: "当前站点启用开关" })).not.toBeChecked()
  })

  it("renders configured + unsupported state and hides current-site toggle", () => {
    renderPopup({
      state: createState({
        downloaderConnectionStatus: "idle",
        activeTab: {
          url: "https://example.org/",
          sourceId: null,
          supported: false,
          enabled: false,
          batchRunning: false
        }
      })
    })

    expect(screen.getByText("当前页面暂不支持批量下载")).toBeInTheDocument()
    expect(screen.queryByRole("switch", { name: "当前站点启用开关" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "批次历史" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "过滤规则" })).toBeInTheDocument()
  })

  it("routes quick actions through the expected options routes", async () => {
    const user = userEvent.setup()
    const { onOpenOptionsRoute } = renderPopup({
      state: createState({
        downloaderConnectionStatus: "ready",
        activeTab: {
          url: "https://kisssub.org/",
          sourceId: "kisssub",
          supported: true,
          enabled: true,
          batchRunning: false
        }
      })
    })

    await user.click(screen.getByRole("button", { name: "批次历史" }))
    await user.click(screen.getByRole("button", { name: "过滤规则" }))

    expect(onOpenOptionsRoute).toHaveBeenNthCalledWith(1, "/history")
    expect(onOpenOptionsRoute).toHaveBeenNthCalledWith(2, "/filters")
  })

  it("fires current-site toggle callback with next enabled state", async () => {
    const user = userEvent.setup()
    const { onToggleCurrentSiteEnabled } = renderPopup({
      state: createState({
        downloaderConnectionStatus: "ready",
        activeTab: {
          url: "https://kisssub.org/",
          sourceId: "kisssub",
          supported: true,
          enabled: true,
          batchRunning: false
        }
      })
    })

    await user.click(screen.getByRole("switch", { name: "当前站点启用开关" }))

    expect(onToggleCurrentSiteEnabled).toHaveBeenCalledWith("kisssub", false)
  })

  it("renders a checking-state card while popup is probing the current downloader", () => {
    renderPopup({
      state: createState({
        downloaderConnectionStatus: "checking",
        activeTab: {
          url: "https://kisssub.org/",
          sourceId: "kisssub",
          supported: true,
          enabled: true,
          batchRunning: false
        }
      })
    })

    expect(screen.getByText("正在检测下载器连接")).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: "当前站点启用开关" })).toBeInTheDocument()
    expect(screen.queryByText("插件已就绪")).not.toBeInTheDocument()
  })

  it("renders English popup copy when the browser locale is English", () => {
    installI18nStub({
      popup_header_subtitle: "Send to current downloader",
      popup_quickActions_history: "History",
      popup_quickActions_filters: "Filters",
      popup_status_unsupported_title: "This page is not supported for batch download"
    })

    renderPopup()

    expect(screen.getByText("Send to current downloader")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Filters" })).toBeInTheDocument()
    expect(screen.getByText("This page is not supported for batch download")).toBeInTheDocument()
  })

  it("renders a failed-connection card with a configure CTA", () => {
    renderPopup({
      state: createState({
        downloaderConnectionStatus: "failed",
        activeTab: {
          url: "https://kisssub.org/",
          sourceId: "kisssub",
          supported: true,
          enabled: true,
          batchRunning: false
        }
      })
    })

    expect(screen.getByText("下载器连接失败")).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: "当前站点启用开关" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "前往配置" })).toBeInTheDocument()
    expect(screen.queryByText("插件已就绪")).not.toBeInTheDocument()
  })

  it("disables current-site switch and shows hint when batch is running", () => {
    renderPopup({
      state: createState({
        downloaderConnectionStatus: "ready",
        activeTab: {
          url: "https://kisssub.org/",
          sourceId: "kisssub",
          supported: true,
          enabled: true,
          batchRunning: true
        }
      })
    })

    expect(screen.getByRole("switch", { name: "当前站点启用开关" })).toBeDisabled()
    expect(screen.getByText("当前批次任务进行中，需等待完成后才能关闭站点。")).toBeInTheDocument()
  })

  it("renders supported sites list from source metadata and state", () => {
    const { container } = renderPopup({
      state: createState({
        supportedSites: [
          {
            id: "kisssub",
            label: "Wrong Label",
            displayName: "Wrong Name",
            url: "wrong.local",
            enabled: true
          },
          {
            id: "dongmanhuayuan",
            label: "Bad Label",
            displayName: "Bad Name",
            url: "bad.local",
            enabled: false
          },
          {
            id: "acgrip",
            label: "Oops",
            displayName: "Oops",
            url: "oops.local",
            enabled: true
          },
          {
            id: "bangumimoe",
            label: "Oops2",
            displayName: "Oops2",
            url: "oops2.local",
            enabled: false
          }
        ]
      })
    })

    expect(screen.getByText("Kisssub 爱恋动漫")).toBeInTheDocument()
    expect(screen.getByText("Dongmanhuayuan")).toBeInTheDocument()
    expect(screen.getAllByText("ACG.RIP").length).toBeGreaterThan(0)
    expect(screen.getAllByText("Bangumi.moe").length).toBeGreaterThan(0)
    expect(container).not.toHaveTextContent("Wrong Name")
    expect(container).not.toHaveTextContent("bad.local")
  })

  it("renders supported sites as clickable links", () => {
    renderPopup()

    expect(screen.getByRole("link", { name: "Kisssub 爱恋动漫" })).toHaveAttribute(
      "href",
      "https://kisssub.org"
    )
    expect(screen.getByRole("link", { name: "Dongmanhuayuan 动漫花园" })).toHaveAttribute(
      "href",
      "https://dongmanhuayuan.com"
    )
    expect(screen.getByRole("link", { name: "ACG.RIP" })).toHaveAttribute("href", "https://acg.rip")
    expect(screen.getByRole("link", { name: "Bangumi.moe" })).toHaveAttribute(
      "href",
      "https://bangumi.moe"
    )
  })

  it("renders footer version and help link", () => {
    renderPopup({
      state: createState({
        version: "2.0.0",
        helpUrl: "https://github.com/horizonzzzz/anime-bt-batch-downloader"
      })
    })

    expect(screen.getByText(/Anime BT Batch v2\.0\.0/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "帮助文档" })).toHaveAttribute(
      "href",
      "https://github.com/horizonzzzz/anime-bt-batch-downloader"
    )
  })

  it("opens general options from header settings action", async () => {
    const user = userEvent.setup()
    const { onOpenGeneralOptions } = renderPopup()

    await user.click(screen.getByRole("button", { name: "打开设置" }))

    expect(onOpenGeneralOptions).toHaveBeenCalledTimes(1)
  })
})
