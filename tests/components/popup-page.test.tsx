import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ComponentProps } from "react"
import { describe, expect, it, vi } from "vitest"

import { PopupPage } from "../../components/popup/PopupPage"
import type { PopupStateViewModel } from "../../lib/shared/popup"

type PopupPageProps = ComponentProps<typeof PopupPage>

function createState(overrides: Partial<PopupStateViewModel> = {}): PopupStateViewModel {
  return {
    qbConfigured: false,
    activeTab: {
      url: null,
      sourceId: null,
      supported: false,
      enabled: false
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

describe("PopupPage", () => {
  it("renders unconfigured state with setup CTA and hides quick actions", () => {
    renderPopup()

    expect(screen.getByText("未配置 qBittorrent")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "立即配置" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "批次历史" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "过滤规则" })).not.toBeInTheDocument()
  })

  it("renders configured + supported state with current-site toggle and quick actions", () => {
    renderPopup({
      state: createState({
        qbConfigured: true,
        activeTab: {
          url: "https://kisssub.org/",
          sourceId: "kisssub",
          supported: true,
          enabled: true
        }
      })
    })

    expect(screen.getByText("插件已就绪")).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: "当前站点启用开关" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "批次历史" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "过滤规则" })).toBeInTheDocument()
  })

  it("renders configured + unsupported state and hides current-site toggle", () => {
    renderPopup({
      state: createState({
        qbConfigured: true,
        activeTab: {
          url: "https://example.org/",
          sourceId: null,
          supported: false,
          enabled: false
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
        qbConfigured: true,
        activeTab: {
          url: "https://kisssub.org/",
          sourceId: "kisssub",
          supported: true,
          enabled: true
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
        qbConfigured: true,
        activeTab: {
          url: "https://kisssub.org/",
          sourceId: "kisssub",
          supported: true,
          enabled: true
        }
      })
    })

    await user.click(screen.getByRole("switch", { name: "当前站点启用开关" }))

    expect(onToggleCurrentSiteEnabled).toHaveBeenCalledWith("kisssub", false)
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
