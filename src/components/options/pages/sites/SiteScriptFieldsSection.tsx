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
        title="脚本参数"
        description="保留历史脚本配置，重新启用后会继续沿用当前参数。"
      />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="remoteScriptUrl">Kisssub 外部脚本地址</Label>
          <Input id="remoteScriptUrl" {...register("remoteScriptUrl")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="remoteScriptRevision">Kisssub 脚本版本号</Label>
          <Input id="remoteScriptRevision" {...register("remoteScriptRevision")} />
        </div>
      </div>
    </section>
  )
}
