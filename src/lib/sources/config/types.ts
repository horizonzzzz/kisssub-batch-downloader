import type { DeliveryMode, SourceId } from "../../shared/types"

type BaseSourceRuntimeConfig<TDeliveryMode extends DeliveryMode> = {
  enabled: boolean
  deliveryMode: TDeliveryMode
}

export type SourceConfig = {
  kisssub: BaseSourceRuntimeConfig<DeliveryMode>
  dongmanhuayuan: BaseSourceRuntimeConfig<"magnet">
  acgrip: BaseSourceRuntimeConfig<"torrent-url" | "torrent-file">
  bangumimoe: BaseSourceRuntimeConfig<DeliveryMode>
  comicat: BaseSourceRuntimeConfig<"magnet" | "torrent-file">
}