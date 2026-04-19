import { i18n } from "../../../../lib/i18n"
import { useEffect, useState } from "react"

import type { FilterConfig } from "../../../../lib/filter-rules/types"
import type { OptionsApi } from "../../OptionsPage"

export function useFilterWorkbench(api: OptionsApi) {
  const [config, setConfig] = useState<FilterConfig>({ rules: [] })
  const [status, setStatus] = useState<{
    tone: "info" | "success" | "warning" | "error"
    message: string
  }>({
    tone: "info",
    message: i18n.t("options.status.loadingSettings")
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true

    void api.getFilterConfig()
      .then((nextConfig) => {
        if (!active) return
        setConfig(nextConfig)
        setLoading(false)
        setStatus({
          tone: "success",
          message: i18n.t("options.status.settingsLoaded")
        })
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoading(false)
        setStatus({
          tone: "error",
          message: error instanceof Error ? error.message : i18n.t("options.status.loadFailed")
        })
      })

    return () => {
      active = false
    }
  }, [api])

  async function save() {
    setSaving(true)
    setStatus({
      tone: "info",
      message: i18n.t("options.status.savingSettings")
    })
    try {
      const saved = await api.saveFilterConfig(config)
      setConfig(saved)
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
  }

  return { config, setConfig, status, loading, saving, save }
}