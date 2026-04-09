import { i18n } from "../../../../lib/i18n"
import type { JSX } from "react"

import { useFormContext } from "react-hook-form"

import { Input, Label } from "../../../ui"
import { SectionHeading } from "../../form/SectionHeading"
import type {
  SettingsFormInput,
  SettingsFormValues
} from "../../schema/settings-form"

export function SiteScriptFieldsSection(): JSX.Element {
  const { register } = useFormContext<
    SettingsFormInput,
    unknown,
    SettingsFormValues
  >()

  return (
    <section className="grid gap-4 border-t border-zinc-100 pt-6">
      <SectionHeading
        title={i18n.t("options.sites.scriptFields.title")}
        description={i18n.t("options.sites.scriptFields.description")}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="remoteScriptUrl">{i18n.t("options.sites.scriptFields.remoteScriptUrlLabel")}</Label>
          <Input id="remoteScriptUrl" {...register("remoteScriptUrl")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="remoteScriptRevision">{i18n.t("options.sites.scriptFields.remoteScriptRevisionLabel")}</Label>
          <Input id="remoteScriptRevision" {...register("remoteScriptRevision")} />
        </div>
      </div>
    </section>
  )
}


