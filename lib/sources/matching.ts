import type { SourceId } from "../shared/types"
import { SOURCE_IDS } from "./catalog"

export const SOURCE_MATCH_HOSTS: Readonly<Record<SourceId, readonly string[]>> = Object.freeze({
  kisssub: ["kisssub.org"],
  dongmanhuayuan: ["dongmanhuayuan.com"],
  acgrip: ["acg.rip"],
  bangumimoe: ["bangumi.moe"]
})

export const CONTENT_SCRIPT_MATCH_PATTERNS: string[] = SOURCE_IDS.flatMap((sourceId) =>
  SOURCE_MATCH_HOSTS[sourceId].map((host) => `*://*.${host}/*`)
)

export function matchesSourceHost(sourceId: SourceId, url: URL): boolean {
  const hostname = url.hostname.toLowerCase()

  return SOURCE_MATCH_HOSTS[sourceId].some((host) => hostname === host || hostname.endsWith(`.${host}`))
}
