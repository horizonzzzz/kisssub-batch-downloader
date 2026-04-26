import { useState, useMemo } from "react"

import { i18n } from "../../../../lib/i18n"
import { requestDownloaderPermission } from "../../../../lib/downloader/permissions"
import { mapDownloaderValidationErrorToSaveMessage } from "../../../../lib/downloader/validation-errors"
import { HiOutlineArrowPath } from "react-icons/hi2"

import { Button, Alert } from "../../../ui"
import { useDownloaderWorkbench } from "./downloader-workbench-context"
import { useBatchExecutionConfigWorkbench } from "./use-batch-execution-workbench"
import { ConnectionHelpAlert } from "./ConnectionHelpAlert"
import { DownloaderSelectorSection } from "./DownloaderSelectorSection"
import { ExtractionCadenceSection } from "./ExtractionCadenceSection"
import { GeneralStatusPanel } from "./GeneralStatusPanel"
import { QbCredentialsSection } from "./QbCredentialsSection"
import { TransmissionCredentialsSection } from "./TransmissionCredentialsSection"
import { useDownloaderValidationState } from "./use-downloader-validation-state"
import { useOptionsPageFooter } from "../../layout/OptionsPageFooter"
import type { OptionsApi } from "../../OptionsPage"
import { getDownloaderMeta } from "../../../../lib/downloader"

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
  const validationState = useDownloaderValidationState(api, downloaderWorkbench.config)

  const currentDownloaderId = downloaderWorkbench.config.activeId
  const currentDownloaderProfile = downloaderWorkbench.config.profiles[currentDownloaderId]
  const currentDownloaderName = getDownloaderMeta(currentDownloaderId).displayName

  const handleSaveGeneralSettings = async () => {
    const requiresFreshValidation = validationState.uiState !== "verified"

    setGeneralSaving(true)
    setSaveStatus(null)
    if (requiresFreshValidation) {
      validationState.beginTesting()
    } else {
      validationState.beginSaving()
    }

    try {
      await requestDownloaderPermission(downloaderWorkbench.config)
      if (requiresFreshValidation) {
        validationState.beginSaving()
      }

      const saved = await api.saveGeneralSettings({
        downloaderConfig: downloaderWorkbench.config,
        batchExecutionConfig: batchWorkbench.config
      })

      downloaderWorkbench.setConfig(saved.downloaderConfig)
      batchWorkbench.setConfig(saved.batchExecutionConfig)
      validationState.applySavedValidation(saved.validation)

      setSaveStatus({
        tone: "success",
        message: i18n.t("options.general.validation.saved")
      })
    } catch (error: unknown) {
      const message = mapDownloaderValidationErrorToSaveMessage(error)
      validationState.markFailed(message)
      setSaveStatus({
        tone: "error",
        message
      })
    } finally {
      setGeneralSaving(false)
    }
  }

  const workbenchStatus =
    [downloaderWorkbench.status, batchWorkbench.status].find((status) => status.tone === "error" && status.message)
    ?? [downloaderWorkbench.status, batchWorkbench.status].find((status) => status.message)
    ?? { tone: "info", message: "" as string }

  const validationTone = validationState.uiState === "verified"
    ? "success"
    : validationState.uiState === "failed"
      ? "error"
      : "info"

  const validationDescription = validationState.version
    ? i18n.t("options.general.validation.validatedVersion", [validationState.version])
    : undefined

  const panelTone = saveStatus?.tone
    || (workbenchStatus.tone === "error" ? "error" : validationTone)

  const panelTitle = saveStatus?.tone === "success"
    ? validationState.message
    : saveStatus?.message
    || (workbenchStatus.tone === "error" && workbenchStatus.message
      ? workbenchStatus.message
      : validationState.message)

  const latestActionCandidate = saveStatus
    ? (saveStatus.tone === "success" ? saveStatus.message : undefined)
    : workbenchStatus.message

  const latestActionMessage = latestActionCandidate && latestActionCandidate !== panelTitle
    ? latestActionCandidate
    : undefined

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
      <div role="status" aria-live="polite">
        <GeneralStatusPanel
          tone={panelTone}
          title={panelTitle}
          downloaderName={currentDownloaderName}
          baseUrl={currentDownloaderProfile.baseUrl}
          latestActionMessage={latestActionMessage}
          validatedVersionText={validationDescription}
        />
      </div>

      <DownloaderSelectorSection
        activeId={downloaderWorkbench.config.activeId}
        onActiveIdChange={(id) => downloaderWorkbench.setConfig({
          ...downloaderWorkbench.config,
          activeId: id
        })}
      />

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
        />
      )}

      <ConnectionHelpAlert />

      <ExtractionCadenceSection
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        config={batchWorkbench.config}
        onConfigChange={batchWorkbench.setConfig}
      />
    </div>
  )
}
