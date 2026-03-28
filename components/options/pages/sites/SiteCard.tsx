import { HiChevronDown, HiChevronUp } from "react-icons/hi2"
import { useFormContext } from "react-hook-form"

import { getDeliveryModeLabel, getSupportedDeliveryModes } from "../../../../lib/sources/delivery"
import type { SiteConfigMeta } from "../../../../lib/sources/site-meta"
import type { DeliveryMode, SourceId } from "../../../../lib/shared/types"
import { cn } from "../../../../lib/shared/cn"
import {
  Badge,
  Card,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Switch
} from "../../../ui"
import type {
  SettingsFormInput,
  SettingsFormValues
} from "../../schema/settings-form"

function SectionHeading({
  title,
  description
}: {
  title: string
  description?: string
}) {
  return (
    <div className="grid gap-1">
      <h3 className="text-base font-medium text-zinc-900">{title}</h3>
      {description ? (
        <p className="text-sm leading-6 text-zinc-500">{description}</p>
      ) : null}
    </div>
  )
}

type SiteCardProps = {
  site: SiteConfigMeta
  siteIcon: string
  isEnabled: boolean
  isExpanded: boolean
  currentMode: DeliveryMode
  onToggleExpanded: (sourceId: SourceId) => void
  onToggleEnabled: (sourceId: SourceId, enabled: boolean) => void
}

export function SiteCard({
  site,
  siteIcon,
  isEnabled,
  isExpanded,
  currentMode,
  onToggleExpanded,
  onToggleEnabled
}: SiteCardProps) {
  const { register, setValue } = useFormContext<
    SettingsFormInput,
    unknown,
    SettingsFormValues
  >()
  const supportedModes = getSupportedDeliveryModes(site.id)

  return (
    <article data-testid={`site-card-${site.id}`}>
      <Card
        className={cn(
          "overflow-hidden transition-colors duration-200",
          isEnabled
            ? "border-blue-200 bg-white shadow-sm"
            : "border-zinc-200 bg-zinc-50/60 opacity-75 shadow-none"
        )}>
        <div>
          <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full bg-zinc-100 p-1"
                )}>
                <img
                  src={siteIcon}
                  alt=""
                  loading="eager"
                  decoding="async"
                  data-testid={`site-icon-${site.id}`}
                  className={cn(
                    "block h-full w-full rounded-full object-contain",
                    isEnabled ? "" : "grayscale opacity-70"
                  )}
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={cn("text-base font-semibold", isEnabled ? "text-zinc-900" : "text-zinc-500")}>
                    {site.displayName}
                  </h2>
                  <Badge variant={isEnabled ? "brand" : "muted"}>
                    {isEnabled ? site.badgeWhenEnabled : site.badgeWhenDisabled}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="inline-flex items-center gap-3 text-sm font-medium text-zinc-600">
                <span>启用</span>
                <Switch
                  checked={isEnabled}
                  aria-label={`${site.navLabel} 启用开关`}
                  onCheckedChange={(checked) => onToggleEnabled(site.id, Boolean(checked))}
                />
              </div>
              {isEnabled ? (
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                  aria-label={`${site.navLabel} ${isExpanded ? "收起" : "展开"}配置`}
                  onClick={() => onToggleExpanded(site.id)}>
                  {isExpanded ? (
                    <HiChevronUp className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <HiChevronDown className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              ) : null}
            </div>
          </div>

          {isExpanded ? (
            <div className="space-y-6 border-t border-zinc-100 bg-white px-5 py-6">
              {site.strategyMode === "locked" ? (
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
              ) : (
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
              )}

              {site.hasKisssubScriptFields ? (
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
              ) : null}

              {site.noteDescription ? (
                <div
                  className={cn(
                    "grid gap-2 rounded-lg border px-4 py-4",
                    site.noteTone === "warning"
                      ? "border-amber-200 bg-amber-50"
                      : site.noteTone === "neutral"
                        ? "border-zinc-200 bg-zinc-50"
                        : "border-blue-100 bg-blue-50"
                  )}>
                  {site.noteTitle ? (
                    <div
                      className={cn(
                        "text-sm font-semibold",
                        site.noteTone === "warning" ? "text-amber-800" : "text-blue-800"
                      )}>
                      {site.noteTitle}
                    </div>
                  ) : null}
                  <div className="text-sm leading-6 text-zinc-700">{site.noteDescription}</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>
    </article>
  )
}
