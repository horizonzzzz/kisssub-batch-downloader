import { useEffect, useMemo, useState } from "react"

import { Alert, Button, Card, Form, Input, InputNumber, Radio, Tag, Typography } from "antd"
import type { AlertProps } from "antd"
import { FaGithub } from "react-icons/fa"

import speedlineBrandIcon from "../assets/anime-bt-icon-speedline.svg"
import { getDeliveryModeLabel, getSupportedDeliveryModes } from "../lib/delivery"
import { DEFAULT_SETTINGS } from "../lib/settings"
import type { Settings, SourceId, TestQbConnectionResult } from "../lib/types"

export type OptionsApi = {
  loadSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<Settings>
  testConnection: (settings: Settings) => Promise<TestQbConnectionResult>
}

type OptionsPageProps = {
  api: OptionsApi
}

type StatusTone = "info" | "success" | "error"
type OptionsViewId = "general" | "kisssub" | "dongmanhuayuan" | "acgrip" | "overview"
type ConnectionState = "idle" | "success" | "error"

const statusTypeMap: Record<StatusTone, AlertProps["type"]> = {
  info: "info",
  success: "success",
  error: "error"
}

const BRAND_NAME = "Anime BT Batch"
const REPO_URL = "https://github.com/horizonzzzz/anime-bt-batch-downloader"

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
    description: "维护脚本解析参数，并指定 Kisssub 资源的投递策略。",
    footerLabel: "正在编辑 Kisssub 专属配置"
  },
  dongmanhuayuan: {
    title: "Dongmanhuayuan 专属配置",
    description: "当前沿用通用策略，并为未来新增的站点参数预留结构。",
    footerLabel: "正在编辑 Dongmanhuayuan 专属配置"
  },
  acgrip: {
    title: "ACG.RIP 专属配置",
    description: "定义 ACG.RIP 站点的下载投递方式，避免直链提交失败。",
    footerLabel: "正在编辑 ACG.RIP 专属配置"
  },
  overview: {
    title: "源站概览",
    description: "查看当前扩展支持的动漫 BT 站点状态。",
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
      { key: "acgrip", label: "ACG.RIP" }
    ]
  },
  {
    title: "关于与支持",
    items: [{ key: "overview", label: "源站概览" }]
  }
]

const overviewSites = [
  {
    name: "Kisssub",
    url: "kisssub.org",
    accentClassName: "is-kisssub",
    summary: "支持脚本辅助解析与多种投递策略。"
  },
  {
    name: "Dongmanhuayuan",
    url: "dongmanhuayuan.com",
    accentClassName: "is-dongmanhuayuan",
    summary: "当前以磁力链为主，配置保持轻量。"
  },
  {
    name: "ACG.RIP",
    url: "acg.rip",
    accentClassName: "is-acgrip",
    summary: "优先推荐种子下载后上传到 qB。"
  }
]

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
      className={active ? "options-sidebar__button is-active" : "options-sidebar__button"}
      onClick={onClick}>
      <span className="options-sidebar__button-dot" aria-hidden="true" />
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
    <main className="options-shell">
      <Form
        form={form}
        layout="vertical"
        initialValues={DEFAULT_SETTINGS}
        onFinish={() => void handleSave()}
        className="options-workbench">
        <aside className="options-sidebar">
          <div className="options-sidebar__brand">
            <div className="options-sidebar__brand-mark">
              <img
                src={speedlineBrandIcon}
                alt=""
                loading="eager"
                decoding="async"
                data-testid="options-brand-icon"
                className="options-sidebar__brand-icon"
                aria-hidden="true"
              />
            </div>
            <div>
              <div className="options-sidebar__brand-name">{BRAND_NAME}</div>
              <div className="options-sidebar__brand-subtitle">Extension Settings</div>
            </div>
          </div>

          <div className="options-sidebar__groups">
            {navGroups.map((group) => (
              <section key={group.title} className="options-sidebar__group">
                <p className="options-sidebar__group-title">{group.title}</p>
                <div className="options-sidebar__group-items">
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

          <div className="options-sidebar__footer">
            <div className="options-sidebar__footer-meta">
              <span>3 个支持源站</span>
              <strong>qBittorrent WebUI</strong>
            </div>
            <a
              className="options-sidebar__github-link"
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="查看 GitHub 仓库">
              <FaGithub aria-hidden="true" focusable="false" />
              <span>查看 GitHub 仓库</span>
            </a>
          </div>
        </aside>

        <section className="options-main">
          <div className="options-main__scroll">
            <div className="options-main__inner">
              <header className="options-page-header">
                <Tag variant="filled" className="options-page-header__tag">
                  {BRAND_NAME}
                </Tag>
                <Typography.Title level={1}>{activeMeta.title}</Typography.Title>
                <Typography.Paragraph>{activeMeta.description}</Typography.Paragraph>
              </header>

              <div role="status" aria-live="polite" className="options-status">
                <Alert showIcon type={statusTypeMap[status.tone]} title={status.message} />
              </div>

              {activeView === "general" && (
                <div className="options-view">
                  <div className="options-stat-grid">
                    <Card variant="borderless" className="options-stat-card">
                      <span className="options-stat-card__label">支持站点</span>
                      <strong>3 个动漫 BT 源站</strong>
                      <p>按站点拆分配置，避免长表单继续膨胀。</p>
                    </Card>
                    <Card variant="borderless" className="options-stat-card">
                      <span className="options-stat-card__label">默认投递目标</span>
                      <strong>qBittorrent WebUI</strong>
                      <p>连接配置集中管理，站点只保留专属项。</p>
                    </Card>
                  </div>

                  <Alert
                    showIcon
                    type="info"
                    className="options-note"
                    title="qB WebUI 兼容性提示"
                    description={
                      <div className="options-note__body">
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

                  <Card variant="borderless" className="options-panel">
                    <div className="options-panel__header">
                      <div>
                        <Typography.Title level={3}>qBittorrent 认证</Typography.Title>
                        <Typography.Paragraph>
                          配置扩展用于测试连接和提交任务的 WebUI 地址与账号信息。
                        </Typography.Paragraph>
                      </div>
                    </div>

                    <div className="options-field-grid">
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

                    <div className="options-inline-actions">
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
                          className={
                            connectionState === "success"
                              ? "options-inline-feedback is-success"
                              : "options-inline-feedback is-error"
                          }>
                          {connectionState === "success" ? "连接成功" : "连接失败"}
                          {connectionMessage ? ` · ${connectionMessage}` : ""}
                        </span>
                      ) : null}
                    </div>
                  </Card>

                  <Card
                    variant="borderless"
                    className={
                      advancedOpen
                        ? "options-panel options-panel--advanced is-open"
                        : "options-panel options-panel--advanced"
                    }>
                    <button
                      type="button"
                      className="options-advanced-toggle"
                      aria-expanded={advancedOpen}
                      onClick={() => setAdvancedOpen((current) => !current)}>
                      <div>
                        <Typography.Title level={3}>批量提取节奏</Typography.Title>
                        <Typography.Paragraph>
                          配置并发数、重试次数以及注入和稳定等待时间。
                        </Typography.Paragraph>
                      </div>
                      <span className="options-advanced-toggle__icon" aria-hidden="true">
                        {advancedOpen ? "−" : "+"}
                      </span>
                    </button>

                    {advancedOpen ? (
                      <div className="options-field-grid options-field-grid--advanced">
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
                <div className="options-view">
                  <Card variant="borderless" className="options-panel">
                    <div className="options-panel__header options-panel__header--stacked">
                      <div>
                        <Typography.Title level={3}>Kisssub 解析参数</Typography.Title>
                        <Typography.Paragraph>
                          当站点依赖远程脚本辅助提取时，可在这里维护脚本地址与版本号。
                        </Typography.Paragraph>
                      </div>
                      <Tag color="blue">脚本解析</Tag>
                    </div>

                    <div className="options-field-grid">
                      <Form.Item label="Kisssub 外部脚本地址" name="remoteScriptUrl">
                        <Input />
                      </Form.Item>
                      <Form.Item label="Kisssub 脚本版本号" name="remoteScriptRevision">
                        <Input />
                      </Form.Item>
                    </div>
                  </Card>

                  <Card variant="borderless" className="options-panel">
                    <div className="options-panel__header options-panel__header--stacked">
                      <div>
                        <Typography.Title level={3}>下载策略</Typography.Title>
                        <Typography.Paragraph>
                          优先使用磁力链，必要时回退为种子链接或下载后上传。
                        </Typography.Paragraph>
                      </div>
                    </div>

                    <Form.Item label="下载策略" name={["sourceDeliveryModes", "kisssub"]}>
                      <Radio.Group className="options-radio-group">
                        {renderDeliveryModeOptions("kisssub")}
                      </Radio.Group>
                    </Form.Item>
                  </Card>
                </div>
              )}

              {activeView === "dongmanhuayuan" && (
                <div className="options-view">
                  <Card variant="borderless" className="options-panel options-empty-state">
                    <div className="options-empty-state__icon" aria-hidden="true">
                      DM
                    </div>
                    <Typography.Title level={3}>暂无专属配置项</Typography.Title>
                    <Typography.Paragraph>
                      当前站点默认沿用全局设置，仅支持磁力链模式。未来若新增提取参数，会继续收敛在这个站点面板中。
                    </Typography.Paragraph>
                  </Card>
                </div>
              )}

              {activeView === "acgrip" && (
                <div className="options-view">
                  <Card variant="borderless" className="options-panel">
                    <div className="options-panel__header options-panel__header--stacked">
                      <div>
                        <Typography.Title level={3}>下载策略</Typography.Title>
                        <Typography.Paragraph>
                          为避免 qB 直接拉取站点种子链接失败，建议优先使用下载后上传。
                        </Typography.Paragraph>
                      </div>
                      <Tag color="cyan">推荐上传</Tag>
                    </div>

                    <Form.Item label="下载策略" name={["sourceDeliveryModes", "acgrip"]}>
                      <Radio.Group className="options-radio-group">
                        {renderDeliveryModeOptions("acgrip")}
                      </Radio.Group>
                    </Form.Item>

                    <div className="options-message-card">
                      默认使用“先下载种子再上传到 qB”，因为 qB 直接拉取该站种子链接可能失败。
                    </div>
                  </Card>
                </div>
              )}

              {activeView === "overview" && (
                <div className="options-view">
                  <div className="options-overview-grid">
                    {overviewSites.map((site) => (
                      <Card
                        key={site.name}
                        variant="borderless"
                        className={`options-site-card ${site.accentClassName}`}>
                        <div className="options-site-card__status">
                          <span className="options-site-card__dot" aria-hidden="true" />
                          <span>支持良好</span>
                        </div>
                        <Typography.Title level={3}>{site.name}</Typography.Title>
                        <Typography.Paragraph>{site.url}</Typography.Paragraph>
                        <p className="options-site-card__summary">{site.summary}</p>
                        <Button type="default" onClick={() => window.open(`https://${site.url}`, "_blank")}>
                          访问站点
                        </Button>
                      </Card>
                    ))}
                  </div>

                  <Card variant="borderless" className="options-panel options-panel--dark">
                    <Typography.Title level={3}>当前能力</Typography.Title>
                    <ul className="options-bullets">
                      <li>配置页已按站点拆分导航，基础配置与站点专属配置分层管理。</li>
                      <li>qB 连接与提取节奏集中维护，减少重复编辑和长滚动。</li>
                      <li>站点专属视图保留扩展位，后续新增 BT 站点时无需继续拉长同一页面。</li>
                    </ul>
                  </Card>
                </div>
              )}
            </div>
          </div>

          <footer className="options-footer">
            <div className="options-footer__context">
              <span className="options-footer__eyebrow">当前视图</span>
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
