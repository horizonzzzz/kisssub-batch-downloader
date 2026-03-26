import { useEffect, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import type { TestQbConnectionResult } from "../../../lib/types"
import type { OptionsApi } from "../OptionsPage"
import {
  createSettingsFormDefaults,
  settingsFormSchema,
  toSettingsPayload,
  type SettingsFormInput,
  type SettingsFormValues
} from "../schema/settings-form"

export type StatusTone = "info" | "success" | "error"
export type ConnectionState = "idle" | "success" | "error"

function buildValidationMessage() {
  return "请先修正表单中的错误。"
}

export function useSettingsForm(api: OptionsApi) {
  const form = useForm<SettingsFormInput, unknown, SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: createSettingsFormDefaults(),
    mode: "onSubmit"
  })
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

        form.reset(createSettingsFormDefaults(loaded))
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

  const handleSave = form.handleSubmit(
    async (values) => {
      setSaving(true)
      setStatus({
        tone: "info",
        message: "正在保存设置。"
      })

      try {
        const saved = await api.saveSettings(toSettingsPayload(values))
        form.reset(createSettingsFormDefaults(saved))
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
    },
    async () => {
      setStatus({
        tone: "error",
        message: buildValidationMessage()
      })
    }
  )

  const handleTestConnection = async () => {
    const isValid = await form.trigger()

    if (!isValid) {
      setConnectionState("error")
      setConnectionMessage(buildValidationMessage())
      setStatus({
        tone: "error",
        message: buildValidationMessage()
      })
      return
    }

    setTesting(true)
    setConnectionState("idle")
    setConnectionMessage("")
    setStatus({
      tone: "info",
      message: "正在测试连接。"
    })

    try {
      const result = (await api.testConnection(
        toSettingsPayload(form.getValues())
      )) as TestQbConnectionResult
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

  return {
    form,
    status,
    connectionState,
    connectionMessage,
    saving,
    testing,
    handleSave,
    handleTestConnection
  }
}
