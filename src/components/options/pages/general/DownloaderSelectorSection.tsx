import { i18n } from "../../../../lib/i18n"
import type { JSX } from "react"

import { useFormContext } from "react-hook-form"

import { Card, CardContent, CardDescription, CardHeader, CardTitle, RadioGroup, RadioGroupItem } from "../../../ui"
import type { SettingsFormInput, SettingsFormValues } from "../../schema/settings-form"

export function DownloaderSelectorSection(): JSX.Element {
  const { register, watch, setValue } = useFormContext<SettingsFormInput, unknown, SettingsFormValues>()
  const selectedDownloaderId = watch("currentDownloaderId")

  const currentDownloaderIdField = register("currentDownloaderId")

  return (
    <Card>
      <CardHeader>
        <CardTitle>{i18n.t("options.general.downloaderSelector.title")}</CardTitle>
        <CardDescription>
          {i18n.t("options.general.downloaderSelector.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={selectedDownloaderId}
          onValueChange={(value) => {
            currentDownloaderIdField.onChange({
              target: {
                value
              }
            })
            setValue("currentDownloaderId", value as SettingsFormValues["currentDownloaderId"], {
              shouldDirty: true,
              shouldTouch: true
            })
          }}
          className="grid gap-3"
        >
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm transition hover:border-blue-300">
            <RadioGroupItem value="qbittorrent" id="downloader-qbittorrent" aria-label="qBittorrent" />
            <div className="space-y-1">
              <div className="text-sm font-medium text-zinc-950">qBittorrent</div>
              <p className="text-sm leading-relaxed text-zinc-500">
                {i18n.t("options.general.downloaderSelector.qbDescription")}
              </p>
            </div>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm transition hover:border-blue-300">
            <RadioGroupItem value="transmission" id="downloader-transmission" aria-label="Transmission" />
            <div className="space-y-1">
              <div className="text-sm font-medium text-zinc-950">Transmission</div>
              <p className="text-sm leading-relaxed text-zinc-500">
                {i18n.t("options.general.downloaderSelector.transmissionDescription")}
              </p>
            </div>
          </label>
        </RadioGroup>
      </CardContent>
    </Card>
  )
}


