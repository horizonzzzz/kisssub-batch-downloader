import type { SourceConfig } from "./types"

export const DEFAULT_SOURCE_CONFIG: SourceConfig = Object.freeze({
  kisssub: {
    enabled: true,
    deliveryMode: "magnet"
  },
  dongmanhuayuan: {
    enabled: true,
    deliveryMode: "magnet"
  },
  acgrip: {
    enabled: true,
    deliveryMode: "torrent-file"
  },
  bangumimoe: {
    enabled: true,
    deliveryMode: "magnet"
  },
  comicat: {
    enabled: true,
    deliveryMode: "magnet"
  }
})