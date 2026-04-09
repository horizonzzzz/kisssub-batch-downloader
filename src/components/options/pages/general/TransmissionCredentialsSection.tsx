import { i18n } from "../../../../lib/i18n"
import type { JSX } from "react"

import { HiOutlineArrowPath } from "react-icons/hi2"
import { useFormContext } from "react-hook-form"

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input
} from "../../../ui"
import { FormField } from "../../form/Field"
import type { ConnectionState } from "../../hooks/use-settings-form"
import type {
  SettingsFormInput,
  SettingsFormValues
} from "../../schema/settings-form"

type TransmissionCredentialsSectionProps = {
  connectionMessage: string
  connectionState: ConnectionState
  testing: boolean
  onTestConnection: () => Promise<void>
}

function getConnectionStatusClassName(connectionState: ConnectionState): string {
  if (connectionState === "success") {
    return "inline-flex items-center text-sm font-medium text-emerald-600"
  }

  return "inline-flex items-center text-sm font-medium text-red-600"
}

export function TransmissionCredentialsSection({
  connectionMessage,
  connectionState,
  testing,
  onTestConnection
}: TransmissionCredentialsSectionProps): JSX.Element {
  const {
    register,
    formState: { errors }
  } = useFormContext<SettingsFormInput, unknown, SettingsFormValues>()

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
              htmlFor="downloaders.transmission.baseUrl"
              required
              error={errors.downloaders?.transmission?.baseUrl?.message}>
              <Input
                id="downloaders.transmission.baseUrl"
                placeholder="http://127.0.0.1:9091/transmission/rpc"
                autoComplete="url"
                {...register("downloaders.transmission.baseUrl")}
              />
            </FormField>
          </div>

          <FormField
            label={i18n.t("options.general.common.usernameLabel")}
            htmlFor="downloaders.transmission.username"
            error={errors.downloaders?.transmission?.username?.message}>
            <Input
              id="downloaders.transmission.username"
              placeholder="admin"
              autoComplete="username"
              {...register("downloaders.transmission.username")}
            />
          </FormField>

          <FormField
            label={i18n.t("options.general.common.passwordLabel")}
            htmlFor="downloaders.transmission.password"
            error={errors.downloaders?.transmission?.password?.message}>
            <Input
              id="downloaders.transmission.password"
              type="password"
              placeholder={i18n.t("options.general.transmission.passwordPlaceholder")}
              autoComplete="current-password"
              {...register("downloaders.transmission.password")}
            />
          </FormField>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            aria-label={i18n.t("options.general.common.testConnection")}
            onClick={() => void onTestConnection()}
            disabled={testing}>
            {testing ? (
              <HiOutlineArrowPath className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            <span>
              {testing
                ? i18n.t("options.general.common.testingConnection")
                : i18n.t("options.general.common.testConnection")}
            </span>
          </Button>

          {connectionState !== "idle" ? (
            <span className={getConnectionStatusClassName(connectionState)}>
              {connectionState === "success"
                ? i18n.t("options.general.common.connectionSuccess")
                : i18n.t("options.general.common.connectionFailed")}
              {connectionMessage ? ` · ${connectionMessage}` : ""}
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}


