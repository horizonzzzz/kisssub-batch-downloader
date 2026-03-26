import { useEffect, useMemo, useState } from "react"

import { Alert, Button, Form, Tag, Typography } from "antd"
import type { AlertProps } from "antd"
import { FaGithub } from "react-icons/fa"
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom"

import speedlineBrandIcon from "../assets/anime-bt-icon-speedline.svg"
import { SOURCE_IDS } from "../lib/source-config"
import { DEFAULT_SETTINGS } from "../lib/settings"
import type { Settings, TestQbConnectionResult } from "../lib/types"
import { OptionsGeneralPage } from "./options-general-page"
import { OptionsOverviewPage } from "./options-overview-page"
import { OptionsRouteMeta, OPTIONS_ROUTES, DEFAULT_OPTIONS_ROUTE, getOptionsRouteMeta } from "./options-routes"
import { OptionsSitesPage } from "./options-sites-page"
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
type ConnectionState = "idle" | "success" | "error"

const statusTypeMap: Record<StatusTone, AlertProps["type"]> = {
  info: "info",
  success: "success",
  error: "error"
}

const BRAND_NAME = "Anime BT Batch"
const REPO_URL = "https://github.com/horizonzzzz/anime-bt-batch-downloader"

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
    },
    enabledSources: {
      ...DEFAULT_SETTINGS.enabledSources,
      ...(values.enabledSources ?? {})
    }
  }
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

function OptionsWorkspace({ api }: OptionsPageProps) {
  const [form] = Form.useForm<Settings>()
  const location = useLocation()
  const navigate = useNavigate()
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

  const activeMeta = useMemo<OptionsRouteMeta>(
    () => getOptionsRouteMeta(location.pathname),
    [location.pathname]
  )

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
            {OPTIONS_ROUTES.map((route) => (
              <SidebarButton
                key={route.id}
                active={activeMeta.path === route.path}
                label={route.label}
                onClick={() => navigate(route.path)}
              />
            ))}
          </div>

          <div className={styles.sidebarFooter}>
            <div className={styles.sidebarFooterMeta}>
              <span>{SOURCE_IDS.length} 个支持源站</span>
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

              <Routes>
                <Route path="/" element={<Navigate to={DEFAULT_OPTIONS_ROUTE} replace />} />
                <Route
                  path="/general"
                  element={
                    <OptionsGeneralPage
                      connectionMessage={connectionMessage}
                      connectionState={connectionState}
                      testing={testing}
                      onTestConnection={handleTestConnection}
                    />
                  }
                />
                <Route path="/sites" element={<OptionsSitesPage form={form} />} />
                <Route path="/overview" element={<OptionsOverviewPage />} />
                <Route path="*" element={<Navigate to={DEFAULT_OPTIONS_ROUTE} replace />} />
              </Routes>
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

export function OptionsPage({ api }: OptionsPageProps) {
  return (
    <HashRouter>
      <OptionsWorkspace api={api} />
    </HashRouter>
  )
}
