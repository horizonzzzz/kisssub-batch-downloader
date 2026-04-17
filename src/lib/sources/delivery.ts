import { i18n } from "../i18n"

import { SOURCE_IDS } from "./catalog"
import type { AppSettings, DeliveryMode, SourceId } from "../shared/types"

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

export function normalizeSourceDeliveryModes(raw: unknown): AppSettings["sourceDeliveryModes"] {
  const record = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {}
  const normalized: AppSettings["sourceDeliveryModes"] = {}

  for (const sourceId of SOURCE_IDS) {
    normalized[sourceId] = isSupportedDeliveryMode(sourceId, record[sourceId])
      ? (record[sourceId] as DeliveryMode)
      : DEFAULT_SOURCE_DELIVERY_MODES[sourceId]
  }

  return normalized
}

export function resolveSourceDeliveryMode(
  sourceId: SourceId,
  settings: Pick<AppSettings, "sourceDeliveryModes">
): DeliveryMode {
  const configured = settings.sourceDeliveryModes?.[sourceId]
  return isSupportedDeliveryMode(sourceId, configured)
    ? configured
    : DEFAULT_SOURCE_DELIVERY_MODES[sourceId]
}

export function getDeliveryModePriority(
  sourceId: SourceId,
  settings: Pick<AppSettings, "sourceDeliveryModes">
): DeliveryMode[] {
  const preferred = resolveSourceDeliveryMode(sourceId, settings)
  return [preferred, ...SUPPORTED_DELIVERY_MODES[sourceId].filter((mode) => mode !== preferred)]
}

export function getDeliveryModeLabel(mode: DeliveryMode): string {
  if (mode === "magnet") {
    return i18n.t("options.sites.deliveryMode.magnet")
  }

  if (mode === "torrent-url") {
    return i18n.t("options.sites.deliveryMode.torrentUrl")
  }

  return i18n.t("options.sites.deliveryMode.torrentFile")
}

