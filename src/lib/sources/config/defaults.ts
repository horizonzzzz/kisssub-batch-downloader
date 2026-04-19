import type { SourceConfig } from "./types"

export const DEFAULT_SOURCE_CONFIG: SourceConfig = Object.freeze({
  kisssub: {
    enabled: true,
    deliveryMode: "magnet",
    script: {
      url: "//1.acgscript.com/script/miobt/4.js?3",
      revision: "20181120.2"
    }
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
  }
})