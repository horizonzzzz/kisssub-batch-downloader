import { ChevronDown, ChevronUp } from "lucide-react"
import { useFormContext } from "react-hook-form"

import { getDeliveryModeLabel, getSupportedDeliveryModes } from "../../../../lib/delivery"
import type { SiteConfigMeta } from "../../../../lib/source-config"
import type { DeliveryMode, SourceId } from "../../../../lib/types"
import { cn } from "../../../../lib/utils"
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
      <h3 className="font-display text-[1.05rem] tracking-[-0.03em] text-ink-950">
        {title}
      </h3>
      {description ? (
        <p className="text-sm leading-6 text-ink-600">{description}</p>
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
          "overflow-hidden transition-all duration-200",
          isEnabled
            ? "border-azure-500/18 bg-white/92"
            : "border-paper-300/70 bg-white/65 opacity-80"
        )}>
        <div className="flex flex-col gap-4 px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div
                className={cn(
                  "grid h-13 w-13 place-items-center rounded-[1.25rem] border p-1.5",
                  isEnabled
                    ? "border-azure-500/14 bg-white"
                    : "border-paper-300 bg-paper-100"
                )}>
                <img
                  src={siteIcon}
                  alt=""
                  loading="eager"
                  decoding="async"
                  data-testid={`site-icon-${site.id}`}
                  className={cn(
                    "block h-full w-full rounded-[0.9rem] object-contain",
                    isEnabled ? "" : "grayscale opacity-70"
                  )}
                />
              </div>

              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-[1.35rem] tracking-[-0.04em] text-ink-950">
                    {site.displayName}
                  </h2>
                  <Badge variant={isEnabled ? "brand" : "muted"}>
                    {isEnabled ? site.badgeWhenEnabled : site.badgeWhenDisabled}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-3 rounded-full bg-paper-100 px-3 py-2 text-sm font-medium text-ink-700">
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-azure-500/10 text-azure-700 transition hover:-translate-y-0.5 hover:bg-azure-500/16"
                  aria-label={`${site.navLabel} ${isExpanded ? "收起" : "展开"}配置`}
                  onClick={() => onToggleExpanded(site.id)}>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              ) : null}
            </div>
          </div>

          {isExpanded ? (
            <div className="grid gap-5 border-t border-paper-300/80 pt-5">
              {site.strategyMode === "locked" ? (
                <section className="grid gap-3">
                  <SectionHeading
                    title="下载策略"
                    description="该站点当前使用固定下载方式，不提供额外切换项。"
                  />
                  <div className="rounded-[1.25rem] border border-azure-500/15 bg-azure-500/8 px-4 py-4">
                    <span className="text-sm font-semibold text-azure-700">
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
                          className="flex items-start gap-3 rounded-[1.25rem] border border-paper-300/90 bg-white px-4 py-4 transition hover:border-azure-500/22 hover:bg-azure-500/6">
                          <RadioGroupItem value={mode} id={itemId} />
                          <Label htmlFor={itemId} className="cursor-pointer font-normal text-ink-800">
                            {getDeliveryModeLabel(mode)}
                          </Label>
                        </div>
                      )
                    })}
                  </RadioGroup>
                </section>
              )}

              {site.hasKisssubScriptFields ? (
                <section className="grid gap-4">
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
                    "grid gap-2 rounded-[1.25rem] border px-4 py-4",
                    site.noteTone === "warning"
                      ? "border-amber-500/22 bg-amber-500/10"
                      : site.noteTone === "neutral"
                        ? "border-paper-300 bg-paper-100"
                        : "border-azure-500/15 bg-azure-500/8"
                  )}>
                  {site.noteTitle ? (
                    <div
                      className={cn(
                        "text-sm font-semibold",
                        site.noteTone === "warning" ? "text-amber-600" : "text-azure-700"
                      )}>
                      {site.noteTitle}
                    </div>
                  ) : null}
                  <div className="text-sm leading-6 text-ink-700">{site.noteDescription}</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </Card>
    </article>
  )
}
