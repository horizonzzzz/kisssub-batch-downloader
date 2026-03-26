import { useState } from "react"

import { Alert, Button, Card, Form, Input, InputNumber, Typography } from "antd"
import { HiChevronDown, HiChevronUp } from "react-icons/hi2"

import styles from "./options-page.module.scss"

type OptionsGeneralPageProps = {
  connectionMessage: string
  connectionState: "idle" | "success" | "error"
  testing: boolean
  onTestConnection: () => Promise<void>
}

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ")
}

export function OptionsGeneralPage({
  connectionMessage,
  connectionState,
  testing,
  onTestConnection
}: OptionsGeneralPageProps) {
  const [advancedOpen, setAdvancedOpen] = useState(true)

  return (
    <div className={styles.view}>
      <Alert
        showIcon
        type="info"
        className={styles.note}
        title="qB WebUI 兼容性提示"
        description={
          <div className={styles.noteBody}>
            <p>
              扩展会从浏览器扩展上下文访问 <code>http://127.0.0.1:7474</code> 这类本机 WebUI。
              若测试连接返回 401，而账号密码确认无误，请先在 qBittorrent 的{" "}
              <code>Tools/Options -&gt; WebUI</code> 中关闭{" "}
              <code>Enable Cross-Site Request Forgery (CSRF) protection</code>。
            </p>
            <p>
              如果关闭后仍失败，再关闭 <code>Host header validation</code>。仅建议在 WebUI
              只供本机使用时这样配置，不建议暴露到局域网或公网。
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
            <Input.Password placeholder="你的 WebUI 密码" autoComplete="current-password" />
          </Form.Item>
        </div>

        <div className={styles.inlineActions}>
          <Button
            type="default"
            aria-label="测试 qB 连接"
            onClick={() => void onTestConnection()}
            loading={testing}
            disabled={testing}>
            测试 qB 连接
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
        className={joinClassNames(styles.panel, styles.advancedPanel, advancedOpen && styles.isOpen)}>
        <button
          type="button"
          className={styles.advancedToggle}
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((current) => !current)}>
          <div>
            <Typography.Title level={3}>批量提取节奏</Typography.Title>
            <Typography.Paragraph>配置并发数、重试次数以及注入和稳定等待时间。</Typography.Paragraph>
          </div>
          <span className={styles.advancedToggleIconShell} aria-hidden="true">
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
          </span>
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
  )
}
