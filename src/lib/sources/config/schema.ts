import { isSupportedDeliveryMode } from "../delivery"
import type { DeliveryMode, SourceId } from "../../shared/types"
import type { SourceConfig } from "./types"
import { DEFAULT_SOURCE_CONFIG } from "./defaults"

export function sanitizeSourceConfig(raw: unknown): SourceConfig {
  const record = typeof raw === "object" && raw ? (raw as Record<string, unknown>) : {}

  return {
    kisssub: normalizeKisssubConfig(record.kisssub),
    dongmanhuayuan: normalizeDongmanhuayuanConfig(record.dongmanhuayuan),
    acgrip: normalizeAcgripConfig(record.acgrip),
    bangumimoe: normalizeBangumimoeConfig(record.bangumimoe),
    comicat: normalizeComicatConfig(record.comicat)
  }
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value
  }

  return fallback
}

function normalizeKisssubConfig(raw: unknown): SourceConfig["kisssub"] {
  const defaults = DEFAULT_SOURCE_CONFIG.kisssub

  if (!raw || typeof raw !== "object") {
    return defaults
  }

  const record = raw as Record<string, unknown>
  const enabled = normalizeBoolean(record.enabled, defaults.enabled)
  const deliveryMode = normalizeDeliveryMode(record.deliveryMode, "kisssub", defaults.deliveryMode)

  return {
    enabled,
    deliveryMode
  }
}

function normalizeDongmanhuayuanConfig(raw: unknown): SourceConfig["dongmanhuayuan"] {
  const defaults = DEFAULT_SOURCE_CONFIG.dongmanhuayuan

  if (!raw || typeof raw !== "object") {
    return defaults
  }

  const record = raw as Record<string, unknown>
  const enabled = normalizeBoolean(record.enabled, defaults.enabled)
  const deliveryMode = normalizeDeliveryMode(record.deliveryMode, "dongmanhuayuan", defaults.deliveryMode)

  // dongmanhuayuan only supports magnet
  return {
    enabled,
    deliveryMode: "magnet"
  }
}

function normalizeAcgripConfig(raw: unknown): SourceConfig["acgrip"] {
  const defaults = DEFAULT_SOURCE_CONFIG.acgrip

  if (!raw || typeof raw !== "object") {
    return defaults
  }

  const record = raw as Record<string, unknown>
  const enabled = normalizeBoolean(record.enabled, defaults.enabled)
  // acgrip only supports torrent-url or torrent-file
  const deliveryMode = normalizeDeliveryModeForAcgrip(record.deliveryMode, defaults.deliveryMode)

  return {
    enabled,
    deliveryMode
  }
}

function normalizeBangumimoeConfig(raw: unknown): SourceConfig["bangumimoe"] {
  const defaults = DEFAULT_SOURCE_CONFIG.bangumimoe

  if (!raw || typeof raw !== "object") {
    return defaults
  }

  const record = raw as Record<string, unknown>
  const enabled = normalizeBoolean(record.enabled, defaults.enabled)
  const deliveryMode = normalizeDeliveryMode(record.deliveryMode, "bangumimoe", defaults.deliveryMode)

  return {
    enabled,
    deliveryMode
  }
}

function normalizeDeliveryMode(
  raw: unknown,
  sourceId: SourceId,
  fallback: DeliveryMode
): DeliveryMode {
  if (isSupportedDeliveryMode(sourceId, raw)) {
    return raw
  }

  return fallback
}

function normalizeDeliveryModeForAcgrip(
  raw: unknown,
  fallback: "torrent-url" | "torrent-file"
): "torrent-url" | "torrent-file" {
  if (raw === "torrent-url" || raw === "torrent-file") {
    return raw
  }

  return fallback
}

function normalizeComicatConfig(raw: unknown): SourceConfig["comicat"] {
  const defaults = DEFAULT_SOURCE_CONFIG.comicat

  if (!raw || typeof raw !== "object") {
    return defaults
  }

  const record = raw as Record<string, unknown>
  const enabled = normalizeBoolean(record.enabled, defaults.enabled)
  const deliveryMode =
    record.deliveryMode === "magnet" || record.deliveryMode === "torrent-file"
      ? record.deliveryMode
      : defaults.deliveryMode

  return { enabled, deliveryMode }
}
