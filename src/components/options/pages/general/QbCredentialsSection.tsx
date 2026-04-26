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

type QbCredentialsSectionProps = {
  config: DownloaderProfile
  onConfigChange: (config: DownloaderProfile) => void
}

export function QbCredentialsSection({
  config,
  onConfigChange
}: QbCredentialsSectionProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{i18n.t("options.general.qb.title")}</CardTitle>
        <CardDescription>
          {i18n.t("options.general.qb.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <FormField
              label={i18n.t("options.general.qb.baseUrlLabel")}
              htmlFor="qbittorrent.baseUrl"
              required>
              <Input
                id="qbittorrent.baseUrl"
                placeholder="http://127.0.0.1:17474"
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
            htmlFor="qbittorrent.username">
            <Input
              id="qbittorrent.username"
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
            htmlFor="qbittorrent.password">
            <Input
              id="qbittorrent.password"
              type="password"
              placeholder={i18n.t("options.general.qb.passwordPlaceholder")}
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
