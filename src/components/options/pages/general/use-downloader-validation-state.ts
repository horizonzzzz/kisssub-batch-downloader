import { useEffect, useMemo, useState } from "react"

import { createDownloaderValidationFingerprint } from "../../../../lib/downloader/validation"
import { i18n } from "../../../../lib/i18n"
import type { DownloaderConfig } from "../../../../lib/downloader/config/types"
import type {
  DownloaderValidationSnapshot,
  DownloaderValidationState,
  GeneralSettingsValidationResult
} from "../../../../lib/shared/types"
import type { OptionsApi } from "../../OptionsPage"

export type DownloaderValidationUiState =
  | "idle-unverified"
  | "testing"
  | "saving"
  | "verified"
  | "failed"

type ValidationPhase = "idle" | "testing" | "saving" | "failed"

export function useDownloaderValidationState(
  api: Pick<OptionsApi, "getDownloaderValidationState">,
  config: DownloaderConfig
) {
  const [storedState, setStoredState] = useState<DownloaderValidationState>({})
  const [matchingSnapshot, setMatchingSnapshot] = useState<DownloaderValidationSnapshot | null>(null)
  const [phase, setPhase] = useState<ValidationPhase>("idle")
  const [failureMessage, setFailureMessage] = useState("")

  useEffect(() => {
    let active = true

    void api.getDownloaderValidationState()
      .then((nextState) => {
        if (!active) return
        setStoredState(nextState)
      })
      .catch(() => {
        if (!active) return
        setStoredState({})
      })

    return () => {
      active = false
    }
  }, [api])

  useEffect(() => {
    let active = true

    void createDownloaderValidationFingerprint(config)
      .then((fingerprint) => {
        if (!active) return
        const snapshot = storedState[config.activeId]
        setMatchingSnapshot(snapshot?.configFingerprint === fingerprint ? snapshot : null)
      })
      .catch(() => {
        if (!active) return
        setMatchingSnapshot(null)
      })

    return () => {
      active = false
    }
  }, [config, storedState])

  const uiState = useMemo<DownloaderValidationUiState>(() => {
    if (phase === "testing") return "testing"
    if (phase === "saving") return "saving"
    if (phase === "failed") return "failed"
    return matchingSnapshot ? "verified" : "idle-unverified"
  }, [matchingSnapshot, phase])

  const message = useMemo(() => {
    switch (uiState) {
      case "testing":
        return i18n.t("options.general.validation.testing")
      case "saving":
        return i18n.t("options.general.validation.saving")
      case "failed":
        return failureMessage
      case "verified":
        return i18n.t("options.general.validation.verified")
      case "idle-unverified":
      default:
        return i18n.t("options.general.validation.unverified")
    }
  }, [failureMessage, uiState])

  return {
    uiState,
    message,
    version: matchingSnapshot?.version ?? "",
    beginTesting() {
      setFailureMessage("")
      setPhase("testing")
    },
    beginSaving() {
      setFailureMessage("")
      setPhase("saving")
    },
    markFailed(nextMessage: string) {
      setFailureMessage(nextMessage)
      setPhase("failed")
    },
    applySavedValidation(nextValidation: GeneralSettingsValidationResult) {
      setStoredState((currentState) => ({
        ...currentState,
        [nextValidation.downloaderId]: {
          configFingerprint: nextValidation.configFingerprint,
          validatedAt: nextValidation.validatedAt,
          version: nextValidation.version
        }
      }))
      setFailureMessage("")
      setPhase("idle")
    }
  }
}
