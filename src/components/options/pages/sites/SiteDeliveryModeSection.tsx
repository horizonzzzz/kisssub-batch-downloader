import type { JSX } from "react"

import { useFormContext } from "react-hook-form"

import {
  getDeliveryModeLabel,
  getSupportedDeliveryModes
} from "../../../../lib/sources/delivery"
import type { SiteConfigMeta } from "../../../../lib/sources/site-meta"
import type { DeliveryMode } from "../../../../lib/shared/types"
import { cn } from "../../../../lib/shared/cn"
import { Label, RadioGroup, RadioGroupItem } from "../../../ui"
import { SectionHeading } from "../../form/SectionHeading"
import type {
  SettingsFormInput,
  SettingsFormValues
} from "../../schema/settings-form"

type SiteDeliveryModeSectionProps = {
  site: SiteConfigMeta
  currentMode: DeliveryMode
}

export function SiteDeliveryModeSection({
  site,
  currentMode
}: SiteDeliveryModeSectionProps): JSX.Element {
  const { setValue } = useFormContext<
    SettingsFormInput,
    unknown,
    SettingsFormValues
  >()
  const supportedModes = getSupportedDeliveryModes(site.id)

  if (site.strategyMode === "locked") {
    return (
      <section className="grid gap-3">
        <SectionHeading
          title="下载策略"
          description="该站点当前使用固定下载方式，不提供额外切换项。"
        />
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
          <span className="text-sm font-medium text-zinc-700">
            {site.lockedStrategyLabel}
          </span>
        </div>
      </section>
    )
  }

  return (
    <section className="grid gap-4">
      <SectionHeading
        title="下载策略"
        description={`当前策略：${getDeliveryModeLabel(currentMode)}`}
      />
      <RadioGroup
        value={currentMode}
        onValueChange={(value) =>
          setValue(
            `sourceDeliveryModes.${site.id}`,
            value as DeliveryMode,
            { shouldDirty: true }
          )
        }>
        {supportedModes.map((mode) => {
          const itemId = `${site.id}-${mode}`

          return (
            <div
              key={mode}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors",
                currentMode === mode
                  ? "border-blue-200 bg-blue-50/60"
                  : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
              )}>
              <RadioGroupItem value={mode} id={itemId} />
              <Label htmlFor={itemId} className="flex-1 cursor-pointer font-normal text-zinc-700">
                {getDeliveryModeLabel(mode)}
              </Label>
            </div>
          )
        })}
      </RadioGroup>
    </section>
  )
}
