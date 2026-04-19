import { i18n } from "../i18n"

import { SOURCE_IDS } from "./catalog"
import { DEFAULT_SOURCE_CONFIG } from "./config/defaults"
import type { DeliveryMode, SourceId } from "../shared/types"
import type { SourceConfig } from "./config/types"

const SUPPORTED_DELIVERY_MODES: Record<SourceId, readonly DeliveryMode[]> = {
  kisssub: ["magnet", "torrent-url", "torrent-file"],
  dongmanhuayuan: ["magnet"],
  acgrip: ["torrent-url", "torrent-file"],
  bangumimoe: ["magnet", "torrent-url", "torrent-file"]
}

export const DEFAULT_SOURCE_DELIVERY_MODES: Record<SourceId, DeliveryMode> = {
  kisssub: DEFAULT_SOURCE_CONFIG.kisssub.deliveryMode,
  dongmanhuayuan: DEFAULT_SOURCE_CONFIG.dongmanhuayuan.deliveryMode,
  acgrip: DEFAULT_SOURCE_CONFIG.acgrip.deliveryMode,
  bangumimoe: DEFAULT_SOURCE_CONFIG.bangumimoe.deliveryMode
}

export function getSupportedDeliveryModes(sourceId: SourceId): DeliveryMode[] {
  return [...SUPPORTED_DELIVERY_MODES[sourceId]]
}

export function isSupportedDeliveryMode(sourceId: SourceId, mode: unknown): mode is DeliveryMode {
  return typeof mode === "string" && SUPPORTED_DELIVERY_MODES[sourceId].includes(mode as DeliveryMode)
}

export function getDeliveryModePriority(
  sourceId: SourceId,
  config: SourceConfig
): DeliveryMode[] {
  const preferred = config[sourceId].deliveryMode
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

