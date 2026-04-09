import { i18n } from "../../../lib/i18n"
import { useEffect, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useWatch } from "react-hook-form"

import type { TestDownloaderConnectionResult } from "../../../lib/shared/types"
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
  return i18n.t("options.status.validationError")
}

export function useSettingsForm(api: OptionsApi) {
  const form = useForm<SettingsFormInput, unknown, SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: createSettingsFormDefaults(),
    mode: "onSubmit"
  })
  const [status, setStatus] = useState<{ tone: StatusTone; message: string }>({
    tone: "info",
    message: i18n.t("options.status.loadingSettings")
  })
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle")
  const [connectionMessage, setConnectionMessage] = useState("")
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const currentDownloaderId = useWatch({
    control: form.control,
    name: "currentDownloaderId"
  })

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
          message: i18n.t("options.status.settingsLoaded")
        })
      })
      .catch((error: unknown) => {
        if (!active) {
          return
        }

        setStatus({
          tone: "error",
          message: error instanceof Error ? error.message : i18n.t("options.status.loadFailed")
        })
      })

    return () => {
      active = false
    }
  }, [api, form])

  useEffect(() => {
    setConnectionState("idle")
    setConnectionMessage("")
  }, [currentDownloaderId])

  const handleSave = form.handleSubmit(
    async (values) => {
      setSaving(true)
      setStatus({
        tone: "info",
        message: i18n.t("options.status.savingSettings")
      })

      try {
        const saved = await api.saveSettings(toSettingsPayload(values))
        form.reset(createSettingsFormDefaults(saved))
        setStatus({
          tone: "success",
          message: i18n.t("options.status.settingsSaved")
        })
      } catch (error: unknown) {
        setStatus({
          tone: "error",
          message: error instanceof Error ? error.message : i18n.t("options.status.saveFailed")
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
      message: i18n.t("options.status.testingConnection")
    })

    try {
      const result = (await api.testConnection(
        toSettingsPayload(form.getValues())
      )) as TestDownloaderConnectionResult
      setConnectionState("success")
      setConnectionMessage(
        i18n.t("options.status.connectedTo", [result.displayName, result.baseUrl || i18n.t("options.status.noAddressReturned")])
      )
      setStatus({
        tone: "success",
        message: i18n.t("options.status.connectionSucceeded", [
          result.displayName,
          result.baseUrl || "",
          result.version || "unknown"
        ])
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t("options.status.connectionTestFailed")
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
