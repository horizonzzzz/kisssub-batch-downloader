import type { JSX } from "react"

import * as Collapsible from "@radix-ui/react-collapsible"
import { HiChevronDown, HiChevronUp } from "react-icons/hi2"
import { useFormContext } from "react-hook-form"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input
} from "../../../ui"
import { FormField } from "../../form/Field"
import type {
  SettingsFormInput,
  SettingsFormValues
} from "../../schema/settings-form"

type ExtractionCadenceSectionProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExtractionCadenceSection({
  open,
  onOpenChange
}: ExtractionCadenceSectionProps): JSX.Element {
  const {
    register,
    formState: { errors }
  } = useFormContext<SettingsFormInput, unknown, SettingsFormValues>()

  return (
    <Collapsible.Root open={open} onOpenChange={onOpenChange}>
      <Card>
        <CardHeader className="p-0">
          <Collapsible.Trigger
            type="button"
            className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-zinc-50/80"
            aria-expanded={open}>
            <div>
              <CardTitle className="text-base">批量提取节奏</CardTitle>
              <CardDescription className="mt-1">
                配置并发数、重试次数以及注入和稳定等待时间。
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
            <FormField label="并发数" htmlFor="concurrency" error={errors.concurrency?.message}>
              <Input id="concurrency" type="number" {...register("concurrency")} />
            </FormField>
            <FormField label="重试次数" htmlFor="retryCount" error={errors.retryCount?.message}>
              <Input id="retryCount" type="number" {...register("retryCount")} />
            </FormField>
            <FormField
              label="注入超时(ms)"
              htmlFor="injectTimeoutMs"
              error={errors.injectTimeoutMs?.message}>
              <Input
                id="injectTimeoutMs"
                type="number"
                min={3000}
                max={60000}
                step={500}
                {...register("injectTimeoutMs")}
              />
            </FormField>
            <FormField
              label="稳定等待(ms)"
              htmlFor="domSettleMs"
              error={errors.domSettleMs?.message}>
              <Input
                id="domSettleMs"
                type="number"
                min={200}
                max={10000}
                step={100}
                {...register("domSettleMs")}
              />
            </FormField>
          </CardContent>
        </Collapsible.Content>
      </Card>
    </Collapsible.Root>
  )
}
