import type { DeliveryMode, SourceId } from "../../shared/types"

type BaseSourceRuntimeConfig<TDeliveryMode extends DeliveryMode> = {
  enabled: boolean
  deliveryMode: TDeliveryMode
}

export type SourceConfig = {
  kisssub: BaseSourceRuntimeConfig<DeliveryMode> & {
    script: {
      url: string
      revision: string
    }
  }
  dongmanhuayuan: BaseSourceRuntimeConfig<"magnet">
  acgrip: BaseSourceRuntimeConfig<"torrent-url" | "torrent-file">
  bangumimoe: BaseSourceRuntimeConfig<DeliveryMode>
}

export type KisssubScriptConfig = SourceConfig["kisssub"]["script"]