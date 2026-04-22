import type { DeliveryMode, SourceId } from "../../shared/types"
import type { SourceConfig } from "./types"

export function resolveSourceEnabled(sourceId: SourceId, config: SourceConfig): boolean {
  return config[sourceId].enabled
}

export function resolveSourceDeliveryMode(
  sourceId: SourceId,
  config: SourceConfig
): DeliveryMode {
  return config[sourceId].deliveryMode
}


export function getDisabledSources(
  sourceIds: SourceId[],
  config: SourceConfig
): SourceId[] {
  return sourceIds.filter((sourceId) => !resolveSourceEnabled(sourceId, config))
}

export function getEnabledSources(
  sourceIds: SourceId[],
  config: SourceConfig
): SourceId[] {
  return sourceIds.filter((sourceId) => resolveSourceEnabled(sourceId, config))
}