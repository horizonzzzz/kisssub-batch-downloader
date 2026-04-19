import { useState, useEffect, useMemo } from "react"

import { i18n } from "../../../../lib/i18n"
import { requestDownloaderPermission } from "../../../../lib/downloader/permissions"
import { HiOutlineArrowPath } from "react-icons/hi2"

import { Button, Alert } from "../../../ui"
import { useDownloaderWorkbench } from "./downloader-workbench-context"
import { useBatchExecutionConfigWorkbench } from "./use-batch-execution-workbench"
import { ConnectionHelpAlert } from "./ConnectionHelpAlert"
import { DownloaderSelectorSection } from "./DownloaderSelectorSection"
import { ExtractionCadenceSection } from "./ExtractionCadenceSection"
import { QbCredentialsSection, type ConnectionState } from "./QbCredentialsSection"
import { TransmissionCredentialsSection } from "./TransmissionCredentialsSection"
import { useOptionsPageFooter } from "../../layout/OptionsPageFooter"
import type { OptionsApi } from "../../OptionsPage"

type GeneralSettingsPageProps = {
  api: OptionsApi
}

export function GeneralSettingsPage({ api }: GeneralSettingsPageProps) {
  const [advancedOpen, setAdvancedOpen] = useState(true)
  const [generalSaving, setGeneralSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<{
    tone: "info" | "success" | "error"
    message: string
  } | null>(null)

  const downloaderWorkbench = useDownloaderWorkbench()
  const batchWorkbench = useBatchExecutionConfigWorkbench(api)

  const [connectionState, setConnectionState] = useState<ConnectionState>("idle")
  const [connectionMessage, setConnectionMessage] = useState("")
  const [connectionVersion, setConnectionVersion] = useState("")
  const [testing, setTesting] = useState(false)

  const currentDownloaderId = downloaderWorkbench.config.activeId

  // Clear connection state when switching downloaders
  useEffect(() => {
    setConnectionState("idle")
    setConnectionMessage("")
    setConnectionVersion("")
  }, [currentDownloaderId])

  const handleSaveGeneralSettings = async () => {
    setGeneralSaving(true)
    setSaveStatus({
      tone: "info",
      message: i18n.t("options.status.savingSettings")
    })

    try {
      const saved = await api.saveGeneralSettings({
        downloaderConfig: downloaderWorkbench.config,
        batchExecutionConfig: batchWorkbench.config
      })

      downloaderWorkbench.setConfig(saved.downloaderConfig)
      batchWorkbench.setConfig(saved.batchExecutionConfig)

      setSaveStatus({
        tone: "success",
        message: i18n.t("options.status.settingsSaved")
      })
    } catch {
      setSaveStatus({
        tone: "error",
        message: i18n.t("options.general.saveCombinedFailed")
      })
    } finally {
      setGeneralSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setConnectionState("idle")
    setConnectionMessage("")
    setSaveStatus(null)

    try {
      await requestDownloaderPermission(downloaderWorkbench.config)
      const result = await api.testConnection(downloaderWorkbench.config)
      setConnectionState("success")
      setConnectionVersion(result.version)
      setConnectionMessage(
        i18n.t("options.status.connectedTo", [result.displayName, result.baseUrl || i18n.t("options.status.noAddressReturned")])
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : i18n.t("options.status.connectionTestFailed")
      setConnectionState("error")
      setConnectionMessage(message)
    } finally {
      setTesting(false)
    }
  }

  const mapTone = (tone: string) => {
    if (tone === "success") return "success"
    if (tone === "error") return "error"
    return "info"
  }

  // Compute unified status for accessibility region
  const statusMessage = testing
    ? i18n.t("options.status.testingConnection")
    : connectionState === "success"
      ? `${i18n.t("options.general.common.connectionSuccess")}。${connectionVersion}`
      : connectionState === "error"
        ? connectionMessage
        : saveStatus?.message || downloaderWorkbench.status.message || batchWorkbench.status.message || ""

  const statusTone = testing
    ? "info"
    : connectionState === "success"
      ? "success"
      : connectionState === "error"
        ? "error"
        : saveStatus?.tone || mapTone(downloaderWorkbench.status.tone)
  const generalSaveBusy = generalSaving || downloaderWorkbench.saving || batchWorkbench.saving
  const footerConfig = useMemo(() => {
    if (downloaderWorkbench.loading || batchWorkbench.loading) {
      return null
    }

    return {
      description: i18n.t("options.footer.generalDescription"),
      actions: (
        <Button
          type="button"
          size="lg"
          className="min-w-[176px] sm:min-w-[208px]"
          disabled={generalSaveBusy}
          onClick={() => void handleSaveGeneralSettings()}>
          {generalSaveBusy ? (
            <HiOutlineArrowPath className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          <span>{i18n.t("options.general.saveCombined")}</span>
        </Button>
      )
    }
  }, [
    batchWorkbench.loading,
    downloaderWorkbench.loading,
    generalSaveBusy,
    handleSaveGeneralSettings
  ])

  useOptionsPageFooter(footerConfig)

  if (downloaderWorkbench.loading || batchWorkbench.loading) {
    return (
      <div className="space-y-6">
        <div role="status" className="sr-only">
          {i18n.t("options.status.loadingSettings")}
        </div>
        <Alert tone="info" title={i18n.t("options.status.loadingSettings")} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {statusMessage ? (
        <div role="status" aria-live="polite">
          <Alert tone={statusTone} title={statusMessage} />
        </div>
      ) : null}

      <DownloaderSelectorSection
        activeId={downloaderWorkbench.config.activeId}
        onActiveIdChange={(id) => downloaderWorkbench.setConfig({
          ...downloaderWorkbench.config,
          activeId: id
        })}
      />

      <ConnectionHelpAlert />

      {currentDownloaderId === "transmission" ? (
        <TransmissionCredentialsSection
          config={downloaderWorkbench.config.profiles.transmission}
          onConfigChange={(profile) => downloaderWorkbench.setConfig({
            ...downloaderWorkbench.config,
            profiles: {
              ...downloaderWorkbench.config.profiles,
              transmission: profile
            }
          })}
          connectionMessage={connectionMessage}
          connectionState={connectionState}
          testing={testing}
          onTestConnection={handleTestConnection}
        />
      ) : (
        <QbCredentialsSection
          config={downloaderWorkbench.config.profiles.qbittorrent}
          onConfigChange={(profile) => downloaderWorkbench.setConfig({
            ...downloaderWorkbench.config,
            profiles: {
              ...downloaderWorkbench.config.profiles,
              qbittorrent: profile
            }
          })}
          connectionMessage={connectionMessage}
          connectionState={connectionState}
          testing={testing}
          onTestConnection={handleTestConnection}
        />
      )}

      <ExtractionCadenceSection
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        config={batchWorkbench.config}
        onConfigChange={batchWorkbench.setConfig}
      />
    </div>
  )
}
