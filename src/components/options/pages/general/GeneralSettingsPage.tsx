import { useState } from "react"

import { useFormContext } from "react-hook-form"

import type { ConnectionState } from "../../hooks/use-settings-form"
import { ConnectionHelpAlert } from "./ConnectionHelpAlert"
import { DownloaderSelectorSection } from "./DownloaderSelectorSection"
import { ExtractionCadenceSection } from "./ExtractionCadenceSection"
import { QbCredentialsSection } from "./QbCredentialsSection"
import { TransmissionCredentialsSection } from "./TransmissionCredentialsSection"
import type { SettingsFormInput, SettingsFormValues } from "../../schema/settings-form"

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
  const [advancedOpen, setAdvancedOpen] = useState(true)
  const { watch } = useFormContext<SettingsFormInput, unknown, SettingsFormValues>()
  const currentDownloaderId = watch("currentDownloaderId")

  return (
    <div className="space-y-6">
      <DownloaderSelectorSection />
      <ConnectionHelpAlert />
      {currentDownloaderId === "transmission" ? (
        <TransmissionCredentialsSection
          connectionMessage={connectionMessage}
          connectionState={connectionState}
          testing={testing}
          onTestConnection={onTestConnection}
        />
      ) : (
        <QbCredentialsSection
          connectionMessage={connectionMessage}
          connectionState={connectionState}
          testing={testing}
          onTestConnection={onTestConnection}
        />
      )}
      <ExtractionCadenceSection
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
      />
    </div>
  )
}
