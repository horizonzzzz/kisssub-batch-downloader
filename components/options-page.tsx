import { useEffect, useState } from "react"

import {
  Alert,
  Button,
  Card,
  Collapse,
  Form,
  Input,
  InputNumber,
  Space,
  Tag,
  Typography
} from "antd"
import type { AlertProps } from "antd"

import { DEFAULT_SETTINGS } from "../lib/settings"
import type { Settings, TestQbConnectionResult } from "../lib/types"

export type OptionsApi = {
  loadSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<Settings>
  testConnection: (settings: Settings) => Promise<TestQbConnectionResult>
}

type OptionsPageProps = {
  api: OptionsApi
}

type StatusTone = "info" | "success" | "error"

const statusTypeMap: Record<StatusTone, AlertProps["type"]> = {
  info: "info",
  success: "success",
  error: "error"
}

const compatibilityNote = (
  <Space orientation="vertical" size={14} style={{ width: "100%" }}>
    <div>
      <Typography.Title level={4} style={{ margin: 0 }}>
        qB WebUI 兼容提示
      </Typography.Title>
      <Typography.Paragraph style={{ marginBottom: 0 }}>
        扩展会从浏览器扩展上下文访问 <code>http://127.0.0.1:17474</code> 这类本机 WebUI。若测试连接返回
        401，而账号密码确认无误，请先在 qBittorrent 的 <code>Tools/Options -&gt; WebUI</code> 中关闭{" "}
        <code>Enable Cross-Site Request Forgery (CSRF) protection</code>。
      </Typography.Paragraph>
    </div>
    <Typography.Paragraph style={{ marginBottom: 0 }}>
      如果关闭后仍失败，再关闭 <code>Host header validation</code>。仅建议在 WebUI
      只供本机使用时这样配置，不建议暴露到局域网或公网。
    </Typography.Paragraph>
  </Space>
)

const advancedCollapseItems = [
  {
    key: "advanced",
    label: "Kisssub 高级设置",
    children: (
      <div className="options-advanced-grid">
        <Form.Item label="Kisssub 辅助脚本地址" name="remoteScriptUrl">
          <Input />
        </Form.Item>
        <Form.Item label="Kisssub 脚本版本号" name="remoteScriptRevision">
          <Input />
        </Form.Item>
      </div>
    )
  }
]

function normalizeSettings(values: Partial<Settings>): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...values,
    concurrency: Number(values.concurrency ?? DEFAULT_SETTINGS.concurrency),
    retryCount: Number(values.retryCount ?? DEFAULT_SETTINGS.retryCount),
    injectTimeoutMs: Number(values.injectTimeoutMs ?? DEFAULT_SETTINGS.injectTimeoutMs),
    domSettleMs: Number(values.domSettleMs ?? DEFAULT_SETTINGS.domSettleMs)
  }
}

export function OptionsPage({ api }: OptionsPageProps) {
  const [form] = Form.useForm<Settings>()
  const [status, setStatus] = useState<{ tone: StatusTone; message: string }>({
    tone: "info",
    message: "正在读取已保存设置。"
  })
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

  const handleSave = async (values: Settings) => {
    setSaving(true)
    setStatus({
      tone: "info",
      message: "正在保存设置。"
    })

    try {
      const saved = normalizeSettings(await api.saveSettings(normalizeSettings(values)))
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
    setStatus({
      tone: "info",
      message: "正在测试连接。"
    })

    try {
      const result = await api.testConnection(currentSettings)
      setStatus({
        tone: "success",
        message: `连接成功。 ${result.baseUrl || ""} 版本 ${result.version || "unknown"}`
      })
    } catch (error: unknown) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "连接测试失败。"
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <main className="options-shell">
      <section className="options-shell__frame">
        <header className="options-hero">
          <div className="options-hero__copy">
            <Tag variant="filled" className="options-hero__tag">
              Kisssub Batch Downloader
            </Tag>
            <Typography.Title level={1}>设置</Typography.Title>
            <Typography.Paragraph className="options-hero__lead">
              配置当前 qBittorrent WebUI 连接、通用提取节奏，以及 Kisssub 专用的辅助脚本参数。
            </Typography.Paragraph>
          </div>
          <div className="options-hero__meta">
            <div>
              <span>使用场景</span>
              <strong>多站点插件 / 当前 qB</strong>
            </div>
            <div>
              <span>改造重点</span>
              <strong>来源扩展与稳定提取</strong>
            </div>
          </div>
        </header>

        <div className="options-layout">
          <Card variant="borderless" className="options-card options-card--form">
            <Space orientation="vertical" size={20} style={{ width: "100%" }}>
              <div className="options-section-heading">
                <Typography.Title level={3}>连接与注入参数</Typography.Title>
                <Typography.Paragraph>
                  将通用下载器连接项放在前面，把 Kisssub 专用脚本参数折叠起来，并把状态反馈统一收口到一个
                  live region。
                </Typography.Paragraph>
              </div>

              <div role="status" aria-live="polite" className="options-status">
                <Alert showIcon type={statusTypeMap[status.tone]} title={status.message} />
              </div>

              <Form
                form={form}
                layout="vertical"
                initialValues={DEFAULT_SETTINGS}
                onFinish={handleSave}
                className="options-form">
                <Card variant="borderless" className="options-subcard" title="连接与认证">
                  <div className="options-advanced-grid">
                    <Form.Item
                      label="qBittorrent WebUI 地址"
                      name="qbBaseUrl"
                      rules={[{ required: true, message: "请输入 qBittorrent WebUI 地址" }]}>
                      <Input placeholder="http://127.0.0.1:8080" autoComplete="url" />
                    </Form.Item>
                    <Form.Item label="用户名" name="qbUsername">
                      <Input placeholder="admin" autoComplete="username" />
                    </Form.Item>
                    <Form.Item label="密码" name="qbPassword">
                      <Input.Password placeholder="你的 WebUI 密码" autoComplete="current-password" />
                    </Form.Item>
                  </div>
                </Card>

                <div className="options-grid">
                  <Card variant="borderless" className="options-subcard" title="提取节奏">
                    <div className="options-advanced-grid">
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
                  </Card>

                  <Card variant="borderless" className="options-subcard" title="Kisssub 脚本策略">
                    <Collapse ghost items={advancedCollapseItems} />
                  </Card>
                </div>

                <Space wrap size={12} className="options-actions">
                  <Button type="primary" htmlType="submit" loading={saving}>
                    保存设置
                  </Button>
                  <Button
                    type="default"
                    aria-label="测试 qB 连接"
                    onClick={() => void handleTestConnection()}
                    loading={testing}
                    disabled={testing}>
                    测试 qB 连接
                  </Button>
                </Space>
              </Form>
            </Space>
          </Card>

          <div className="options-side">
            <Card variant="borderless" className="options-card options-card--note">
              {compatibilityNote}
            </Card>

            <Card variant="borderless" className="options-card options-card--summary">
              <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  当前界面策略
                </Typography.Title>
                <ul className="options-bullets">
                  <li>配置页使用组件库接管表单、按钮、提示和折叠区。</li>
                  <li>内容脚本浮层继续独立注入样式，不把重型 UI 依赖带进宿主页。</li>
                  <li>Kisssub 专用辅助脚本参数与通用下载器配置分开展示。</li>
                  <li>状态信息统一显示在操作区上方，减少找反馈的成本。</li>
                </ul>
              </Space>
            </Card>
          </div>
        </div>
      </section>
    </main>
  )
}
