import { i18n } from "../../../../lib/i18n"
import type { JSX } from "react"

import * as Collapsible from "@radix-ui/react-collapsible"
import { HiChevronDown, HiChevronUp } from "react-icons/hi2"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input
} from "../../../ui"
import { FormField } from "../../form/Field"
import type { BatchExecutionConfig } from "../../../../lib/batch-config/types"

type ExtractionCadenceSectionProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: BatchExecutionConfig
  onConfigChange: (config: BatchExecutionConfig) => void
}

export function ExtractionCadenceSection({
  open,
  onOpenChange,
  config,
  onConfigChange
}: ExtractionCadenceSectionProps): JSX.Element {
  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange}>
      <Card>
        <CardHeader className="p-0">
          <Collapsible.Trigger
            type="button"
            className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-zinc-50/80"
            aria-expanded={open}>
            <div>
              <CardTitle className="text-base">
                {i18n.t("options.general.extractionCadence.title")}
              </CardTitle>
              <CardDescription className="mt-1">
                {i18n.t("options.general.extractionCadence.description")}
              </CardDescription>
            </div>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-500">
              {open ? (
                <HiChevronUp className="h-5 w-5" aria-hidden="true" />
              ) : (
                <HiChevronDown className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
          </Collapsible.Trigger>
        </CardHeader>

        <Collapsible.Content>
          <CardContent className="grid gap-5 border-t border-zinc-100 bg-zinc-50/50 md:grid-cols-2">
            <FormField
              label={i18n.t("options.general.extractionCadence.concurrencyLabel")}
              htmlFor="concurrency">
              <Input
                id="concurrency"
                type="number"
                min={1}
                max={5}
                value={config.concurrency}
                onChange={(e) => onConfigChange({
                  ...config,
                  concurrency: parseInt(e.target.value, 10) || 1
                })}
              />
            </FormField>
            <FormField
              label={i18n.t("options.general.extractionCadence.retryCountLabel")}
              htmlFor="retryCount">
              <Input
                id="retryCount"
                type="number"
                min={0}
                max={5}
                value={config.retryCount}
                onChange={(e) => onConfigChange({
                  ...config,
                  retryCount: parseInt(e.target.value, 10) || 0
                })}
              />
            </FormField>
            <FormField
              label={i18n.t("options.general.extractionCadence.injectTimeoutLabel")}
              htmlFor="injectTimeoutMs">
              <Input
                id="injectTimeoutMs"
                type="number"
                min={3000}
                max={60000}
                step={500}
                value={config.injectTimeoutMs}
                onChange={(e) => onConfigChange({
                  ...config,
                  injectTimeoutMs: parseInt(e.target.value, 10) || 3000
                })}
              />
            </FormField>
            <FormField
              label={i18n.t("options.general.extractionCadence.domSettleLabel")}
              htmlFor="domSettleMs">
              <Input
                id="domSettleMs"
                type="number"
                min={200}
                max={10000}
                step={100}
                value={config.domSettleMs}
                onChange={(e) => onConfigChange({
                  ...config,
                  domSettleMs: parseInt(e.target.value, 10) || 200
                })}
              />
            </FormField>
          </CardContent>
        </Collapsible.Content>
      </Card>
    </Collapsible.Root>
  )
}
