import { i18n } from "../../../../lib/i18n"
import type { FailureReason } from "../../../../lib/history/types"

type FailureExplanation = {
  label: string
  desc: string
  suggestion: string
}

export function getFailureExplanation(reason: FailureReason): FailureExplanation {
  const normalizedReason = [
    "parse_error",
    "timeout",
    "qb_error",
    "network_error",
    "filtered_out",
    "unknown"
  ].includes(reason)
    ? reason
    : "unknown"

  return {
    label: i18n.t(`options.history.failure.${normalizedReason}.label`),
    desc: i18n.t(`options.history.failure.${normalizedReason}.desc`),
    suggestion: i18n.t(`options.history.failure.${normalizedReason}.suggestion`)
  }
}
