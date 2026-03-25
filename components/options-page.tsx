import { useEffect, useMemo, useState } from "react"

import { Alert, Button, Card, Form, Input, InputNumber, Radio, Tag, Typography } from "antd"
import type { AlertProps } from "antd"
import { FaGithub } from "react-icons/fa"
import { HiChevronDown, HiChevronUp } from "react-icons/hi2"

import speedlineBrandIcon from "../assets/anime-bt-icon-speedline.svg"
import { getDeliveryModeLabel, getSupportedDeliveryModes } from "../lib/delivery"
import { DEFAULT_SETTINGS } from "../lib/settings"
import type { Settings, SourceId, TestQbConnectionResult } from "../lib/types"
import styles from "./options-page.module.scss"

export type OptionsApi = {
  loadSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<Settings>
  testConnection: (settings: Settings) => Promise<TestQbConnectionResult>
}

type OptionsPageProps = {
  api: OptionsApi
}

type StatusTone = "info" | "success" | "error"
type OptionsViewId = "general" | "kisssub" | "dongmanhuayuan" | "acgrip" | "bangumimoe" | "overview"
type ConnectionState = "idle" | "success" | "error"
type OverviewSiteAccent = "kisssub" | "dongmanhuayuan" | "acgrip" | "bangumimoe"

const statusTypeMap: Record<StatusTone, AlertProps["type"]> = {
  info: "info",
  success: "success",
  error: "error"
}

const BRAND_NAME = "Anime BT Batch"
const REPO_URL = "https://github.com/horizonzzzz/anime-bt-batch-downloader"
const SITE_VIEW_DESCRIPTION = "单独配置该站点的下载方式。"
const DELIVERY_MODE_DESCRIPTION = "配置该站点的下载方式。"

const viewMeta: Record<
  OptionsViewId,
  {
    title: string
    description: string
    footerLabel: string
  }
> = {
  general: {
    title: "连接与基础设置",
    description: "配置 qBittorrent WebUI 的连接信息，以及全局批量提取节奏。",
    footerLabel: "正在编辑全局配置"
  },
  kisssub: {
    title: "Kisssub 专属配置",
    description: SITE_VIEW_DESCRIPTION,
    footerLabel: "正在编辑 Kisssub 专属配置"
  },
  dongmanhuayuan: {
    title: "Dongmanhuayuan 专属配置",
    description: SITE_VIEW_DESCRIPTION,
    footerLabel: "正在编辑 Dongmanhuayuan 专属配置"
  },
  acgrip: {
    title: "ACG.RIP 专属配置",
    description: SITE_VIEW_DESCRIPTION,
    footerLabel: "正在编辑 ACG.RIP 专属配置"
  },
  bangumimoe: {
    title: "Bangumi.moe 专属配置",
    description: SITE_VIEW_DESCRIPTION,
    footerLabel: "正在编辑 Bangumi.moe 专属配置"
  },
  overview: {
    title: "源站概览",
    description: "",
    footerLabel: "正在查看支持源站概览"
  }
}

const navGroups: Array<{
  title: string
  items: Array<{ key: OptionsViewId; label: string }>
}> = [
  {
    title: "通用设置",
    items: [{ key: "general", label: "连接与基础设置" }]
  },
  {
    title: "站点专属配置",
    items: [
      { key: "kisssub", label: "Kisssub" },
      { key: "dongmanhuayuan", label: "Dongmanhuayuan" },
      { key: "acgrip", label: "ACG.RIP" },
      { key: "bangumimoe", label: "Bangumi.moe" }
    ]
  },
  {
    title: "关于与支持",
    items: [{ key: "overview", label: "源站概览" }]
  }
]

const overviewSites: Array<{
  name: string
  url: string
  summary: string
  accent: OverviewSiteAccent
}> = [
  {
    name: "Kisssub",
    url: "kisssub.org",
    summary: "整合番组表与字幕组的动漫资源站",
    accent: "kisssub"
  },
  {
    name: "Dongmanhuayuan",
    url: "dongmanhuayuan.com",
    summary: "面向动漫爱好者的BT资源交流站",
    accent: "dongmanhuayuan"
  },
  {
    name: "ACG.RIP",
    url: "acg.rip",
    summary: "分类清晰、以种子直下为主的ACG站",
    accent: "acgrip"
  },
  {
    name: "Bangumi.moe",
    url: "bangumi.moe",
    summary: "追番日历结合最新种子发布的社区",
    accent: "bangumimoe"
  }
]

const siteCardAccentClassNames: Record<OverviewSiteAccent, string> = {
  kisssub: "",
  dongmanhuayuan: styles.siteCardDongmanhuayuan,
  acgrip: styles.siteCardAcgrip,
  bangumimoe: ""
}

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ")
}

function normalizeSettings(values: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...values,
    concurrency: Number(values.concurrency ?? DEFAULT_SETTINGS.concurrency),
    retryCount: Number(values.retryCount ?? DEFAULT_SETTINGS.retryCount),
    injectTimeoutMs: Number(values.injectTimeoutMs ?? DEFAULT_SETTINGS.injectTimeoutMs),
    domSettleMs: Number(values.domSettleMs ?? DEFAULT_SETTINGS.domSettleMs),
    sourceDeliveryModes: {
      ...DEFAULT_SETTINGS.sourceDeliveryModes,
      ...(values.sourceDeliveryModes ?? {})
    }
  }
}

function renderDeliveryModeOptions(sourceId: SourceId) {
  return getSupportedDeliveryModes(sourceId).map((mode) => (
    <Radio key={mode} value={mode}>
      {getDeliveryModeLabel(mode)}
    </Radio>
  ))
}

function SidebarButton({
  active,
  label,
  onClick
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={joinClassNames(styles.sidebarButton, active && styles.isActive)}
      onClick={onClick}>
      <span className={styles.sidebarButtonDot} aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}

export function OptionsPage({ api }: OptionsPageProps) {
  const [form] = Form.useForm<Settings>()
  const [activeView, setActiveView] = useState<OptionsViewId>("general")
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [status, setStatus] = useState<{ tone: StatusTone; message: string }>({
    tone: "info",
    message: "正在读取已保存设置。"
  })
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle")
  const [connectionMessage, setConnectionMessage] = useState("")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    let active = true

    void api
      .loadSettings()
      .then((loaded) => {
        if (!active) {
          return
        }

        form.setFieldsValue(normalizeSettings(loaded))
        setStatus({
          tone: "success",
          message: "设置已加载。"
        })
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setStatus({
          tone: "error",
          message: error instanceof Error ? error.message : "无法读取设置。"
        })
      })

    return () => {
      active = false
    }
  }, [api, form])

  const activeMeta = useMemo(() => viewMeta[activeView], [activeView])

  const handleSave = async () => {
    setSaving(true)
    setStatus({
      tone: "info",
      message: "正在保存设置。"
    })

    try {
      const nextSettings = normalizeSettings(form.getFieldsValue(true))
      const saved = normalizeSettings(await api.saveSettings(nextSettings))
      form.setFieldsValue(saved)
      setStatus({
        tone: "success",
        message: "设置已保存。"
      })
    } catch (error: unknown) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "保存失败。"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    const currentSettings = normalizeSettings(form.getFieldsValue(true))

    setTesting(true)
    setConnectionState("idle")
    setConnectionMessage("")
    setStatus({
      tone: "info",
      message: "正在测试连接。"
    })

    try {
      const result = await api.testConnection(currentSettings)
      setConnectionState("success")
      setConnectionMessage(`已连接到 ${result.baseUrl || "qBittorrent WebUI"}。`)
      setStatus({
        tone: "success",
        message: `连接成功。 ${result.baseUrl || ""} 版本 ${result.version || "unknown"}`
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "连接测试失败。"
      setConnectionState("error")
      setConnectionMessage(message)
      setStatus({
        tone: "error",
        message
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <main className={styles.shell}>
      <Form
        form={form}
        layout="vertical"
        initialValues={DEFAULT_SETTINGS}
        onFinish={() => void handleSave()}
        className={styles.workbench}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarBrand}>
            <div className={styles.sidebarBrandMark}>
              <img
                src={speedlineBrandIcon}
                alt=""
                loading="eager"
                decoding="async"
                data-testid="options-brand-icon"
                className={styles.sidebarBrandIcon}
                aria-hidden="true"
              />
            </div>
            <div>
              <div className={styles.sidebarBrandName}>{BRAND_NAME}</div>
              <div className={styles.sidebarBrandSubtitle}>Extension Settings</div>
            </div>
          </div>

          <div className={styles.sidebarGroups} data-testid="options-sidebar-groups">
            {navGroups.map((group) => (
              <section key={group.title} className={styles.sidebarGroup}>
                <p className={styles.sidebarGroupTitle}>{group.title}</p>
                <div className={styles.sidebarGroupItems}>
                  {group.items.map((item) => (
                    <SidebarButton
                      key={item.key}
                      active={activeView === item.key}
                      label={item.label}
                      onClick={() => setActiveView(item.key)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className={styles.sidebarFooter}>
            <div className={styles.sidebarFooterMeta}>
              <span>4 个支持源站</span>
              <strong>qBittorrent WebUI</strong>
            </div>
            <a
              className={styles.githubLink}
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="查看 GitHub 仓库">
              <FaGithub aria-hidden="true" focusable="false" />
              <span>查看 GitHub 仓库</span>
            </a>
          </div>
        </aside>

        <section className={styles.main}>
          <div className={styles.mainScroll}>
            <div className={styles.mainInner}>
              <header className={styles.pageHeader}>
                <Tag variant="filled" className={styles.pageHeaderTag}>
                  {BRAND_NAME}
                </Tag>
                <Typography.Title level={1}>{activeMeta.title}</Typography.Title>
                {activeMeta.description ? (
                  <Typography.Paragraph>{activeMeta.description}</Typography.Paragraph>
                ) : null}
              </header>

              <div role="status" aria-live="polite" className={styles.status}>
                <Alert showIcon type={statusTypeMap[status.tone]} title={status.message} />
              </div>

              {activeView === "general" && (
                <div className={styles.view}>
                  <Alert
                    showIcon
                    type="info"
                    className={styles.note}
                    title="qB WebUI 兼容性提示"
                    description={
                      <div className={styles.noteBody}>
                        <p>
                          扩展会从浏览器扩展上下文访问 <code>http://127.0.0.1:7474</code> 这类本机
                          WebUI。若测试连接返回 401，而账号密码确认无误，请先在 qBittorrent 的{" "}
                          <code>Tools/Options -&gt; WebUI</code> 中关闭{" "}
                          <code>Enable Cross-Site Request Forgery (CSRF) protection</code>。
                        </p>
                        <p>
                          如果关闭后仍失败，再关闭 <code>Host header validation</code>。仅建议在
                          WebUI 只供本机使用时这样配置，不建议暴露到局域网或公网。
                        </p>
                      </div>
                    }
                  />

                  <Card variant="borderless" className={styles.panel}>
                    <div className={styles.panelHeader}>
                      <div>
                        <Typography.Title level={3}>qBittorrent 认证</Typography.Title>
                        <Typography.Paragraph>
                          配置扩展用于测试连接和提交任务的 WebUI 地址与账号信息。
                        </Typography.Paragraph>
                      </div>
                    </div>

                    <div className={styles.fieldGrid}>
                      <Form.Item
                        label="qBittorrent WebUI 地址"
                        name="qbBaseUrl"
                        rules={[{ required: true, message: "请输入 qBittorrent WebUI 地址" }]}>
                        <Input placeholder="http://127.0.0.1:7474" autoComplete="url" />
                      </Form.Item>
                      <Form.Item label="用户名" name="qbUsername">
                        <Input placeholder="admin" autoComplete="username" />
                      </Form.Item>
                      <Form.Item label="密码" name="qbPassword">
                        <Input.Password
                          placeholder="你的 WebUI 密码"
                          autoComplete="current-password"
                        />
                      </Form.Item>
                    </div>

                    <div className={styles.inlineActions}>
                      <Button
                        type="default"
                        aria-label="测试 qB 连接"
                        onClick={() => void handleTestConnection()}
                        loading={testing}
                        disabled={testing}>
                        测试连接
                      </Button>

                      {connectionState !== "idle" ? (
                        <span
                          className={joinClassNames(
                            styles.inlineFeedback,
                            connectionState === "success" ? styles.isSuccess : styles.isError
                          )}>
                          {connectionState === "success" ? "连接成功" : "连接失败"}
                          {connectionMessage ? ` · ${connectionMessage}` : ""}
                        </span>
                      ) : null}
                    </div>
                  </Card>

                  <Card
                    variant="borderless"
                    className={joinClassNames(
                      styles.panel,
                      styles.advancedPanel,
                      advancedOpen && styles.isOpen
                    )}>
                    <button
                      type="button"
                      className={styles.advancedToggle}
                      aria-expanded={advancedOpen}
                      onClick={() => setAdvancedOpen((current) => !current)}>
                      <div>
                        <Typography.Title level={3}>批量提取节奏</Typography.Title>
                        <Typography.Paragraph>
                          配置并发数、重试次数以及注入和稳定等待时间。
                        </Typography.Paragraph>
                      </div>
                      {advancedOpen ? (
                        <HiChevronUp
                          className={styles.advancedToggleIcon}
                          aria-hidden="true"
                          focusable="false"
                        />
                      ) : (
                        <HiChevronDown
                          className={styles.advancedToggleIcon}
                          aria-hidden="true"
                          focusable="false"
                        />
                      )}
                    </button>

                    {advancedOpen ? (
                      <div className={joinClassNames(styles.fieldGrid, styles.advancedFieldGrid)}>
                        <Form.Item label="并发数" name="concurrency">
                          <InputNumber min={1} max={3} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="重试次数" name="retryCount">
                          <InputNumber min={0} max={3} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="注入超时(ms)" name="injectTimeoutMs">
                          <InputNumber min={3000} max={60000} step={500} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="稳定等待(ms)" name="domSettleMs">
                          <InputNumber min={200} max={10000} step={100} style={{ width: "100%" }} />
                        </Form.Item>
                      </div>
                    ) : null}
                  </Card>
                </div>
              )}

              {activeView === "kisssub" && (
                <div className={styles.view}>
                  <Card variant="borderless" className={styles.panel}>
                    <div className={joinClassNames(styles.panelHeader, styles.stackedHeader)}>
                      <div>
                        <Typography.Title level={3}>Kisssub 解析参数</Typography.Title>
                        <Typography.Paragraph>配置该站点的脚本解析参数。</Typography.Paragraph>
                      </div>
                    </div>

                    <div className={styles.fieldGrid}>
                      <Form.Item label="Kisssub 外部脚本地址" name="remoteScriptUrl">
                        <Input />
                      </Form.Item>
                      <Form.Item label="Kisssub 脚本版本号" name="remoteScriptRevision">
                        <Input />
                      </Form.Item>
                    </div>
                  </Card>

                  <Card variant="borderless" className={styles.panel}>
                    <div className={joinClassNames(styles.panelHeader, styles.stackedHeader)}>
                      <div>
                        <Typography.Title level={3}>下载策略</Typography.Title>
                        <Typography.Paragraph>{DELIVERY_MODE_DESCRIPTION}</Typography.Paragraph>
                      </div>
                    </div>

                    <Form.Item label="下载策略" name={["sourceDeliveryModes", "kisssub"]}>
                      <Radio.Group className={styles.radioGroup}>
                        {renderDeliveryModeOptions("kisssub")}
                      </Radio.Group>
                    </Form.Item>
                  </Card>
                </div>
              )}

              {activeView === "dongmanhuayuan" && (
                <div className={styles.view}>
                  <Card
                    variant="borderless"
                    className={joinClassNames(styles.panel, styles.emptyState)}>
                    <div className={styles.emptyStateIcon} aria-hidden="true">
                      DM
                    </div>
                    <Typography.Title level={3}>暂无专属配置项</Typography.Title>
                    <Typography.Paragraph>当前仅支持磁力链下载方式。</Typography.Paragraph>
                  </Card>
                </div>
              )}

              {activeView === "acgrip" && (
                <div className={styles.view}>
                  <Card variant="borderless" className={styles.panel}>
                    <div className={joinClassNames(styles.panelHeader, styles.stackedHeader)}>
                      <div>
                        <Typography.Title level={3}>下载策略</Typography.Title>
                        <Typography.Paragraph>{DELIVERY_MODE_DESCRIPTION}</Typography.Paragraph>
                      </div>
                    </div>

                    <Form.Item label="下载策略" name={["sourceDeliveryModes", "acgrip"]}>
                      <Radio.Group className={styles.radioGroup}>
                        {renderDeliveryModeOptions("acgrip")}
                      </Radio.Group>
                    </Form.Item>

                    <Alert
                      showIcon
                      type="info"
                      className={styles.note}
                      title="建议先下载种子再上传到 qB"
                      description="qB 直接拉取该站种子链接可能失效。"
                    />
                  </Card>
                </div>
              )}

              {activeView === "bangumimoe" && (
                <div className={styles.view}>
                  <Card variant="borderless" className={styles.panel}>
                    <div className={joinClassNames(styles.panelHeader, styles.stackedHeader)}>
                      <div>
                        <Typography.Title level={3}>下载策略</Typography.Title>
                        <Typography.Paragraph>{DELIVERY_MODE_DESCRIPTION}</Typography.Paragraph>
                      </div>
                    </div>

                    <Form.Item label="下载策略" name={["sourceDeliveryModes", "bangumimoe"]}>
                      <Radio.Group className={styles.radioGroup}>
                        {renderDeliveryModeOptions("bangumimoe")}
                      </Radio.Group>
                    </Form.Item>
                  </Card>
                </div>
              )}

              {activeView === "overview" && (
                <div className={styles.view}>
                  <div className={styles.overviewGrid}>
                    {overviewSites.map((site) => (
                      <Card
                        key={site.name}
                        variant="borderless"
                        className={joinClassNames(
                          styles.siteCard,
                          siteCardAccentClassNames[site.accent]
                        )}>
                        <div className={styles.siteCardStatus}>
                          <span className={styles.siteCardDot} aria-hidden="true" />
                          <span>支持良好</span>
                        </div>
                        <Typography.Title level={3}>{site.name}</Typography.Title>
                        <Typography.Paragraph>{site.summary}</Typography.Paragraph>
                        <Button type="default" onClick={() => window.open(`https://${site.url}`, "_blank")}>
                          访问站点
                        </Button>
                      </Card>
                    ))}
                  </div>

                  <Card
                    variant="borderless"
                    className={joinClassNames(styles.panel, styles.darkPanel)}>
                    <Typography.Title level={3}>当前能力</Typography.Title>
                    <ul className={styles.bullets}>
                      <li>配置页已按站点拆分导航，基础配置与站点专属配置分层管理。</li>
                      <li>qB 连接与提取节奏集中维护，减少重复编辑和长滚动。</li>
                      <li>站点专属视图保留扩展位，后续新增 BT 站点时无需继续拉长同一页面。</li>
                    </ul>
                  </Card>
                </div>
              )}
            </div>
          </div>

          <footer className={styles.footer}>
            <div className={styles.footerContext}>
              <span className={styles.footerEyebrow}>当前视图</span>
              <strong>{activeMeta.footerLabel}</strong>
            </div>
            <Button type="primary" htmlType="submit" loading={saving}>
              保存所有设置
            </Button>
          </footer>
        </section>
      </Form>
    </main>
  )
}
