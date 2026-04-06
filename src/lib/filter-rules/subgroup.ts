import type { SourceId } from "../shared/types"

const WRAPPED_TOKEN_PATTERN = /\[([^\]]+)\]|【([^】]+)】|\(([^)]+)\)/g
const METADATA_PATTERNS = [
  /^\d{3,4}p$/i,
  /^(?:2160p|1440p|1080p|720p|480p|4k)$/i,
  /^(?:web[- ]?dl|web[- ]?rip|baha|at-x|gb|big5|chs|cht|简体|簡體|繁體|繁中|简中|简繁|繁简|aac|avc|hevc(?:-?10bit)?|10bit|8bit|x264|x265|mp4|mkv)$/i,
  /^(?:(?:简|繁|简繁|繁简|简中|繁中|简体|繁体|簡體|繁體|gb|big5|chs|cht).*)?(?:内封|外挂|内嵌).*(?:字幕)?$/i,
  /^(?:简|繁|简繁|繁简|简中|繁中|简体|繁体|簡體|繁體|gb|big5|chs|cht).*(?:字幕)$/i
]

export function extractSubgroup(_sourceId: SourceId, title: string): string {
  const normalizedTitle = String(title ?? "").trim()
  const wrappedTokens = Array.from(normalizedTitle.matchAll(WRAPPED_TOKEN_PATTERN), (match) =>
    (match[1] || match[2] || match[3] || "").trim()
  ).filter(Boolean)

  if (!wrappedTokens.length) {
    return ""
  }

  const [firstToken, ...remainingTokens] = wrappedTokens
  if (isLikelySubgroup(firstToken)) {
    return firstToken
  }

  for (const candidate of remainingTokens) {
    if (isLikelySubgroup(candidate)) {
      return candidate
    }
  }

  return ""
}

function isLikelySubgroup(value: string): boolean {
  if (!value) {
    return false
  }

  if (!/[A-Za-z\u4e00-\u9fff]/.test(value)) {
    return false
  }

  return !METADATA_PATTERNS.some((pattern) => pattern.test(value))
}
