import { useState, useEffect } from "react"

import { i18n } from "../../../../lib/i18n"
import { requestDownloaderPermission } from "../../../../lib/downloader/permissions"
import { HiOutlineArrowPath } from "react-icons/hi2"

import { Button, Card, Alert } from "../../../ui"
import { useDownloaderWorkbench } from "./downloader-workbench-context"
import { useBatchExecutionConfigWorkbench } from "./use-batch-execution-workbench"
import { ConnectionHelpAlert } from "./ConnectionHelpAlert"
import { DownloaderSelectorSection } from "./DownloaderSelectorSection"
import { ExtractionCadenceSection } from "./ExtractionCadenceSection"
import { QbCredentialsSection, type ConnectionState } from "./QbCredentialsSection"
import { TransmissionCredentialsSection } from "./TransmissionCredentialsSection"
import type { OptionsApi } from "../../OptionsPage"

type GeneralSettingsPageProps = {
  api: OptionsApi
}

export function GeneralSettingsPage({ api }: GeneralSettingsPageProps) {
  const [advancedOpen, setAdvancedOpen] = useState(true)

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

  const handleTestConnection = async () => {
    setTesting(true)
    setConnectionState("idle")
    setConnectionMessage("")

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
        : downloaderWorkbench.status.message || batchWorkbench.status.message || ""

  const statusTone = testing
    ? "info"
    : connectionState === "success"
      ? "success"
      : connectionState === "error"
        ? "error"
        : mapTone(downloaderWorkbench.status.tone)

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
      {statusMessage && (
        <div role="status">
          {statusMessage}
        </div>
      )}

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

      <Card className="border-t border-zinc-100 pt-4">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            size="lg"
            className="min-w-[120px]"
            disabled={downloaderWorkbench.saving}
            onClick={() => void downloaderWorkbench.save()}
          >
            {downloaderWorkbench.saving ? (
              <HiOutlineArrowPath className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            <span>{i18n.t("options.general.saveDownloader")}</span>
          </Button>
        </div>
      </Card>

      <ExtractionCadenceSection
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        config={batchWorkbench.config}
        onConfigChange={batchWorkbench.setConfig}
      />

      <Card className="border-t border-zinc-100 pt-4">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            size="lg"
            className="min-w-[120px]"
            disabled={batchWorkbench.saving}
            onClick={() => void batchWorkbench.save()}
          >
            {batchWorkbench.saving ? (
              <HiOutlineArrowPath className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            <span>{i18n.t("options.general.saveBatchExecution")}</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}
