import { useState } from "react"

import * as Collapsible from "@radix-ui/react-collapsible"
import { ChevronDown, ChevronUp, LoaderCircle } from "lucide-react"
import { useFormContext } from "react-hook-form"

import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label
} from "../../../ui"
import type { ConnectionState } from "../../hooks/use-settings-form"
import type {
  SettingsFormInput,
  SettingsFormValues
} from "../../schema/settings-form"

function Field({
  label,
  htmlFor,
  required,
  error,
  children
}: {
  label: string
  htmlFor: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="inline-flex items-center gap-1.5">
        <span>{label}</span>
        {required ? <span className="text-crimson-500">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-sm text-crimson-600">{error}</p> : null}
    </div>
  )
}

type GeneralSettingsPageProps = {
  connectionMessage: string
  connectionState: ConnectionState
  testing: boolean
  onTestConnection: () => Promise<void>
}

export function GeneralSettingsPage({
  connectionMessage,
  connectionState,
  testing,
  onTestConnection
}: GeneralSettingsPageProps) {
  const {
    register,
    formState: { errors }
  } = useFormContext<SettingsFormInput, unknown, SettingsFormValues>()
  const [advancedOpen, setAdvancedOpen] = useState(true)

  return (
    <div className="grid gap-5">
      <Alert
        tone="info"
        title="qB WebUI 兼容性提示"
        description={
          <div className="grid gap-3">
            <p className="m-0">
              扩展会从浏览器扩展上下文访问 <code>http://127.0.0.1:7474</code> 这类本机
              WebUI。若测试连接返回 401，而账号密码确认无误，请先在 qBittorrent 的{" "}
              <code>Tools/Options -&gt; WebUI</code> 中关闭{" "}
              <code>Enable Cross-Site Request Forgery (CSRF) protection</code>。
            </p>
            <p className="m-0">
              如果关闭后仍失败，再关闭 <code>Host header validation</code>。仅建议在
              WebUI 只供本机使用时这样配置，不建议暴露到局域网或公网。
            </p>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>qBittorrent 认证</CardTitle>
          <CardDescription>
            配置扩展用于测试连接和提交任务的 WebUI 地址与账号信息。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 pt-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field
                label="qBittorrent WebUI 地址"
                htmlFor="qbBaseUrl"
                required
                error={errors.qbBaseUrl?.message}>
                <Input
                  id="qbBaseUrl"
                  placeholder="http://127.0.0.1:7474"
                  autoComplete="url"
                  {...register("qbBaseUrl")}
                />
              </Field>
            </div>

            <Field
              label="用户名"
              htmlFor="qbUsername"
              error={errors.qbUsername?.message}>
              <Input
                id="qbUsername"
                placeholder="admin"
                autoComplete="username"
                {...register("qbUsername")}
              />
            </Field>

            <Field
              label="密码"
              htmlFor="qbPassword"
              error={errors.qbPassword?.message}>
              <Input
                id="qbPassword"
                type="password"
                placeholder="你的 WebUI 密码"
                autoComplete="current-password"
                {...register("qbPassword")}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              aria-label="测试 qB 连接"
              onClick={() => void onTestConnection()}
              disabled={testing}>
              {testing ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              <span>{testing ? "测试中..." : "测试 qB 连接"}</span>
            </Button>

            {connectionState !== "idle" ? (
              <span
                className={
                  connectionState === "success"
                    ? "inline-flex items-center rounded-full border border-mint-500/20 bg-mint-500/10 px-3 py-2 text-sm font-medium text-mint-600"
                    : "inline-flex items-center rounded-full border border-crimson-500/18 bg-crimson-500/10 px-3 py-2 text-sm font-medium text-crimson-600"
                }>
                {connectionState === "success" ? "连接成功" : "连接失败"}
                {connectionMessage ? ` · ${connectionMessage}` : ""}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Collapsible.Root open={advancedOpen} onOpenChange={setAdvancedOpen}>
        <Card className={advancedOpen ? "border-azure-500/16" : undefined}>
          <CardHeader className="pb-0">
            <Collapsible.Trigger
              type="button"
              className="flex w-full items-center justify-between gap-4 text-left"
              aria-expanded={advancedOpen}>
              <div>
                <CardTitle>批量提取节奏</CardTitle>
                <CardDescription>
                  配置并发数、重试次数以及注入和稳定等待时间。
                </CardDescription>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-azure-500/10 text-azure-700">
                {advancedOpen ? (
                  <ChevronUp className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-5 w-5" aria-hidden="true" />
                )}
              </span>
            </Collapsible.Trigger>
          </CardHeader>

          <Collapsible.Content>
            <CardContent className="grid gap-5 pt-6 md:grid-cols-2">
              <Field label="并发数" htmlFor="concurrency" error={errors.concurrency?.message}>
                <Input id="concurrency" type="number" min={1} max={3} {...register("concurrency")} />
              </Field>
              <Field label="重试次数" htmlFor="retryCount" error={errors.retryCount?.message}>
                <Input id="retryCount" type="number" min={0} max={3} {...register("retryCount")} />
              </Field>
              <Field
                label="注入超时(ms)"
                htmlFor="injectTimeoutMs"
                error={errors.injectTimeoutMs?.message}>
                <Input
                  id="injectTimeoutMs"
                  type="number"
                  min={3000}
                  max={60000}
                  step={500}
                  {...register("injectTimeoutMs")}
                />
              </Field>
              <Field
                label="稳定等待(ms)"
                htmlFor="domSettleMs"
                error={errors.domSettleMs?.message}>
                <Input
                  id="domSettleMs"
                  type="number"
                  min={200}
                  max={10000}
                  step={100}
                  {...register("domSettleMs")}
                />
              </Field>
            </CardContent>
          </Collapsible.Content>
        </Card>
      </Collapsible.Root>
    </div>
  )
}
