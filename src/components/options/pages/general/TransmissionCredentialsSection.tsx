import { i18n } from "../../../../lib/i18n"
import type { JSX } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input
} from "../../../ui"
import { FormField } from "../../form/Field"
import type { DownloaderProfile } from "../../../../lib/downloader/config/types"

type TransmissionCredentialsSectionProps = {
  config: DownloaderProfile
  onConfigChange: (config: DownloaderProfile) => void
}

export function TransmissionCredentialsSection({
  config,
  onConfigChange
}: TransmissionCredentialsSectionProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{i18n.t("options.general.transmission.title")}</CardTitle>
        <CardDescription>
          {i18n.t("options.general.transmission.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormField
              label={i18n.t("options.general.transmission.baseUrlLabel")}
              htmlFor="transmission.baseUrl"
              required>
              <Input
                id="transmission.baseUrl"
                placeholder="http://127.0.0.1:9091/transmission/rpc"
                autoComplete="url"
                value={config.baseUrl}
                onChange={(e) => onConfigChange({
                  ...config,
                  baseUrl: e.target.value
                })}
              />
            </FormField>
          </div>

          <FormField
            label={i18n.t("options.general.common.usernameLabel")}
            htmlFor="transmission.username">
            <Input
              id="transmission.username"
              placeholder="admin"
              autoComplete="username"
              value={config.username}
              onChange={(e) => onConfigChange({
                ...config,
                username: e.target.value
              })}
            />
          </FormField>

          <FormField
            label={i18n.t("options.general.common.passwordLabel")}
            htmlFor="transmission.password">
            <Input
              id="transmission.password"
              type="password"
              placeholder={i18n.t("options.general.transmission.passwordPlaceholder")}
              autoComplete="current-password"
              value={config.password}
              onChange={(e) => onConfigChange({
                ...config,
                password: e.target.value
              })}
            />
          </FormField>
        </div>
      </CardContent>
    </Card>
  )
}
