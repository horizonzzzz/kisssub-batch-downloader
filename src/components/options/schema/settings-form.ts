import { z } from "zod"

import { DEFAULT_SETTINGS, sanitizeSettings } from "../../../lib/settings"
import type {
  DeliveryMode,
  DownloaderId,
  FilterConditionField,
  FilterConditionOperator,
  Settings,
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
] satisfies Array<Extract<FilterConditionField, "title" | "subgroup">>)

const textConditionOperatorSchema = z.literal(
  "contains" satisfies Extract<FilterConditionOperator, "contains">
)

const sourceConditionOperatorSchema = z.literal(
  "is" satisfies Extract<FilterConditionOperator, "is">
)

const textConditionSchema = z.object({
  id: z.string().trim().min(1, "条件 ID 不能为空"),
  field: textConditionFieldSchema,
  operator: textConditionOperatorSchema,
  value: z.string().trim().min(1, "请输入条件值")
})

const sourceConditionSchema = z.object({
  id: z.string().trim().min(1, "条件 ID 不能为空"),
  field: z.literal("source"),
  operator: sourceConditionOperatorSchema,
  value: sourceIdSchema
})

const filterConditionSchema = z.union([
  textConditionSchema,
  sourceConditionSchema
])

const filterAnyConditionSchema = textConditionSchema

const filterSchema = z.object({
  id: z.string().trim().min(1, "筛选器 ID 不能为空"),
  name: z.string().trim().min(1, "请输入筛选器名称"),
  enabled: z.boolean(),
  must: z.array(filterConditionSchema).min(1, "至少填写一个必须满足条件"),
  any: z.array(filterAnyConditionSchema)
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
  concurrency: z.coerce.number().int().min(1, "最小值为 1").max(5, "最大值为 5"),
  injectTimeoutMs: z.coerce.number().int().min(3000, "最小值为 3000").max(60000, "最大值为 60000"),
  domSettleMs: z.coerce.number().int().min(200, "最小值为 200").max(10000, "最大值为 10000"),
  retryCount: z.coerce.number().int().min(0, "最小值为 0").max(5, "最大值为 5"),
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
      message: "请输入 qBittorrent WebUI 地址",
      path: ["downloaders", "qbittorrent", "baseUrl"]
    })
  }

  if (!values.downloaders.transmission.baseUrl && values.currentDownloaderId === "transmission") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "请输入 Transmission RPC 地址",
      path: ["downloaders", "transmission", "baseUrl"]
    })
  }
})

export type SettingsFormInput = z.input<typeof settingsFormSchema>
export type SettingsFormValues = z.output<typeof settingsFormSchema>

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

export function toSettingsPayload(values: SettingsFormInput): Settings {
  return settingsFormSchema.parse(values)
}
