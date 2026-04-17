import { i18n } from "../../../lib/i18n"
import { z } from "zod"

import { DEFAULT_SETTINGS, sanitizeSettings } from "../../../lib/settings"
import type {
  DeliveryMode,
  DownloaderId,
  SourceId
} from "../../../lib/shared/types"

const deliveryModeSchema = z.enum([
  "magnet",
  "torrent-url",
  "torrent-file"
] satisfies DeliveryMode[])

const sourceIdSchema = z.enum([
  "kisssub",
  "dongmanhuayuan",
  "acgrip",
  "bangumimoe"
] satisfies SourceId[])

const downloaderIdSchema = z.enum([
  "qbittorrent",
  "transmission"
] satisfies DownloaderId[])

const downloaderBaseUrlSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\/+$/, ""))

const textConditionFieldSchema = z.enum([
  "title",
  "subgroup"
])

const textConditionOperatorSchema = z.literal("contains")

const textConditionSchema = z.object({
  id: z.string().trim().min(1, i18n.t("options.validation.conditionIdRequired")),
  field: textConditionFieldSchema,
  operator: textConditionOperatorSchema,
  value: z.string().trim().min(1, i18n.t("options.validation.conditionValueRequired"))
})

const filterSchema = z.object({
  id: z.string().trim().min(1, i18n.t("options.validation.filterIdRequired")),
  name: z.string().trim().min(1, i18n.t("options.validation.filterNameRequired")),
  enabled: z.boolean(),
  sourceIds: z.array(sourceIdSchema).min(1, i18n.t("options.validation.filterSourceRequired")),
  must: z.array(textConditionSchema).min(1, i18n.t("options.validation.filterMustConditionRequired")),
  any: z.array(textConditionSchema)
})

export const settingsFormSchema = z.object({
  currentDownloaderId: downloaderIdSchema,
  downloaders: z.object({
    qbittorrent: z.object({
      baseUrl: downloaderBaseUrlSchema,
      username: z.string().trim(),
      password: z.string()
    }),
    transmission: z.object({
      baseUrl: downloaderBaseUrlSchema,
      username: z.string().trim(),
      password: z.string()
    })
  }),
  concurrency: z.coerce.number().int().min(1, i18n.t("options.validation.minValue", ["1"])).max(5, i18n.t("options.validation.maxValue", ["5"])),
  injectTimeoutMs: z.coerce.number().int().min(3000, i18n.t("options.validation.minValue", ["3000"])).max(60000, i18n.t("options.validation.maxValue", ["60000"])),
  domSettleMs: z.coerce.number().int().min(200, i18n.t("options.validation.minValue", ["200"])).max(10000, i18n.t("options.validation.maxValue", ["10000"])),
  retryCount: z.coerce.number().int().min(0, i18n.t("options.validation.minValue", ["0"])).max(5, i18n.t("options.validation.maxValue", ["5"])),
  remoteScriptUrl: z.string().trim(),
  remoteScriptRevision: z.string().trim(),
  lastSavePath: z.string().trim(),
  sourceDeliveryModes: z.object({
    kisssub: deliveryModeSchema.optional(),
    dongmanhuayuan: deliveryModeSchema.optional(),
    acgrip: deliveryModeSchema.optional(),
    bangumimoe: deliveryModeSchema.optional()
  }),
  enabledSources: z.object({
    kisssub: z.boolean().optional(),
    dongmanhuayuan: z.boolean().optional(),
    acgrip: z.boolean().optional(),
    bangumimoe: z.boolean().optional()
  }),
  filters: z.array(filterSchema)
}).superRefine((values, context) => {
  if (!values.downloaders.qbittorrent.baseUrl && values.currentDownloaderId === "qbittorrent") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: i18n.t("options.validation.qbBaseUrlRequired"),
      path: ["downloaders", "qbittorrent", "baseUrl"]
    })
  }

  if (!values.downloaders.transmission.baseUrl && values.currentDownloaderId === "transmission") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: i18n.t("options.validation.transmissionBaseUrlRequired"),
      path: ["downloaders", "transmission", "baseUrl"]
    })
  }
})

export type SettingsFormInput = z.input<typeof settingsFormSchema>
export type SettingsFormValues = z.output<typeof settingsFormSchema>
export type EditableSettingsPayload = SettingsFormValues

export function createSettingsFormDefaults(
  settings: Record<string, unknown> = {}
): SettingsFormValues {
  return settingsFormSchema.parse(
    sanitizeSettings({
      ...DEFAULT_SETTINGS,
      ...settings
    })
  )
}

export function toSettingsPayload(values: SettingsFormInput): EditableSettingsPayload {
  return settingsFormSchema.parse(values)
}
