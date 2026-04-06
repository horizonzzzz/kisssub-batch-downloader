import type { Settings } from "../shared/types"

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {}
}

export function mergeSettings(
  base: Settings,
  overrides: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  const record = asRecord(overrides)
  const downloaders = asRecord(record.downloaders)
  const qbittorrent = asRecord(downloaders.qbittorrent)
  const transmission = asRecord(downloaders.transmission)

  return {
    ...base,
    ...record,
    downloaders: {
      ...base.downloaders,
      ...downloaders,
      qbittorrent: {
        ...base.downloaders.qbittorrent,
        ...qbittorrent
      },
      transmission: {
        ...base.downloaders.transmission,
        ...transmission
      }
    },
    sourceDeliveryModes: {
      ...base.sourceDeliveryModes,
      ...asRecord(record.sourceDeliveryModes)
    },
    enabledSources: {
      ...base.enabledSources,
      ...asRecord(record.enabledSources)
    }
  }
}
