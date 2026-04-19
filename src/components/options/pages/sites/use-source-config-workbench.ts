import { i18n } from "../../../../lib/i18n"
import { useEffect, useState } from "react"

import type { SourceConfig } from "../../../../lib/sources/config/types"
import type { OptionsApi } from "../../OptionsPage"

export function useSourceConfigWorkbench(api: OptionsApi) {
  const [config, setConfig] = useState<SourceConfig | null>(null)
  const [status, setStatus] = useState({
    tone: "info" as "info" | "success",
    message: i18n.t("options.status.loadingSettings")
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void api.getSourceConfig().then((nextConfig) => {
      if (!active) return
      setConfig(nextConfig)
      setLoading(false)
      setStatus({
        tone: "success",
        message: i18n.t("options.status.settingsLoaded")
      })
    })
    return () => {
      active = false
    }
  }, [api])

  async function save() {
    if (!config) return
    setSaving(true)
    try {
      const saved = await api.saveSourceConfig(config)
      setConfig(saved)
      setStatus({
        tone: "success",
        message: i18n.t("options.status.settingsSaved")
      })
    } finally {
      setSaving(false)
    }
  }

  return { config, setConfig, status, loading, saving, save }
}