import { z } from "zod"

import { DEFAULT_SETTINGS, sanitizeSettings } from "../../../lib/settings"
import type { DeliveryMode, Settings } from "../../../lib/shared/types"

const deliveryModeSchema = z.enum([
  "magnet",
  "torrent-url",
  "torrent-file"
] satisfies DeliveryMode[])

export const settingsFormSchema = z.object({
  qbBaseUrl: z
    .string()
    .trim()
    .min(1, "请输入 qBittorrent WebUI 地址")
    .transform((value) => value.replace(/\/+$/, "")),
  qbUsername: z.string().trim(),
  qbPassword: z.string(),
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
  })
})

export type SettingsFormInput = z.input<typeof settingsFormSchema>
export type SettingsFormValues = z.output<typeof settingsFormSchema>

export function createSettingsFormDefaults(
  settings: Partial<Settings> = {}
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
