import type { DeliveryMode, Settings, SourceId } from "./types"
import { SOURCE_IDS } from "./source-config"

const SUPPORTED_DELIVERY_MODES: Record<SourceId, readonly DeliveryMode[]> = {
  kisssub: ["magnet", "torrent-url", "torrent-file"],
  dongmanhuayuan: ["magnet"],
  acgrip: ["torrent-url", "torrent-file"],
  bangumimoe: ["magnet", "torrent-url", "torrent-file"]
}

export const DEFAULT_SOURCE_DELIVERY_MODES: Record<SourceId, DeliveryMode> = Object.freeze({
  kisssub: "magnet",
  dongmanhuayuan: "magnet",
  acgrip: "torrent-file",
  bangumimoe: "magnet"
})

export function getSupportedDeliveryModes(sourceId: SourceId): DeliveryMode[] {
  return [...SUPPORTED_DELIVERY_MODES[sourceId]]
}

export function isSupportedDeliveryMode(sourceId: SourceId, mode: unknown): mode is DeliveryMode {
  return typeof mode === "string" && SUPPORTED_DELIVERY_MODES[sourceId].includes(mode as DeliveryMode)
}

export function normalizeSourceDeliveryModes(raw: unknown): Settings["sourceDeliveryModes"] {
  const record = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {}
  const normalized: Settings["sourceDeliveryModes"] = {}

  for (const sourceId of SOURCE_IDS) {
    normalized[sourceId] = isSupportedDeliveryMode(sourceId, record[sourceId])
      ? (record[sourceId] as DeliveryMode)
      : DEFAULT_SOURCE_DELIVERY_MODES[sourceId]
  }

  return normalized
}

export function resolveSourceDeliveryMode(
  sourceId: SourceId,
  settings: Pick<Settings, "sourceDeliveryModes">
): DeliveryMode {
  const configured = settings.sourceDeliveryModes?.[sourceId]
  return isSupportedDeliveryMode(sourceId, configured)
    ? configured
    : DEFAULT_SOURCE_DELIVERY_MODES[sourceId]
}

export function getDeliveryModePriority(
  sourceId: SourceId,
  settings: Pick<Settings, "sourceDeliveryModes">
): DeliveryMode[] {
  const preferred = resolveSourceDeliveryMode(sourceId, settings)
  return [preferred, ...SUPPORTED_DELIVERY_MODES[sourceId].filter((mode) => mode !== preferred)]
}

export function getDeliveryModeLabel(mode: DeliveryMode): string {
  if (mode === "magnet") {
    return "优先磁力链"
  }

  if (mode === "torrent-url") {
    return "直接提交种子链接"
  }

  return "先下载种子再上传到 qB"
}
