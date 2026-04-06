import { useEffect, useState } from "react"

import { sendRuntimeRequest } from "../../lib/shared/messages"
import { DEFAULT_OPTIONS_ROUTE, type OptionsRoutePath } from "../../lib/shared/options-routes"
import type {
  PopupDownloaderConnectionStatus,
  PopupStateViewModel
} from "../../lib/shared/popup"
import type { Settings, SourceId } from "../../lib/shared/types"
import { Alert, Button } from "../ui"
import { PopupPage } from "./PopupPage"

const DEFAULT_LOAD_ERROR = "加载弹窗状态失败，请重试。"
const DEFAULT_ACTION_ERROR = "操作失败，请稍后重试。"

async function requestPopupState(): Promise<PopupStateViewModel> {
  const response = await sendRuntimeRequest({ type: "GET_POPUP_STATE" })
  if (!response.ok) {
    throw new Error(response.error || DEFAULT_LOAD_ERROR)
  }

  return response.state
}

function resolveDownloaderConnectionStatus(
  activeTab: PopupStateViewModel["activeTab"]
): PopupDownloaderConnectionStatus {
  if (activeTab.supported && activeTab.enabled && activeTab.sourceId) {
    return "checking"
  }

  return "idle"
}

export function PopupContainer() {
  const [state, setState] = useState<PopupStateViewModel | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionInFlight, setActionInFlight] = useState(false)

  async function loadState(showLoading: boolean, suppressActionError = false) {
    if (showLoading) {
      setLoading(true)
    }

    try {
      const popupState = await requestPopupState()
      setState(popupState)
      setLoadError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : DEFAULT_LOAD_ERROR
      if (state && !suppressActionError) {
        setActionError(message)
      } else if (!state) {
        setLoadError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadState(true)
  }, [])

  useEffect(() => {
    if (!state || state.downloaderConnectionStatus !== "checking") {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const response = await sendRuntimeRequest({
          type: "TEST_DOWNLOADER_CONNECTION"
        })

        if (cancelled) {
          return
        }

        setState((currentState) => {
          if (!currentState || currentState.downloaderConnectionStatus !== "checking") {
            return currentState
          }

          return {
            ...currentState,
            downloaderConnectionStatus: response.ok ? "ready" : "failed"
          }
        })
      } catch {
        if (cancelled) {
          return
        }

        setState((currentState) => {
          if (!currentState || currentState.downloaderConnectionStatus !== "checking") {
            return currentState
          }

          return {
            ...currentState,
            downloaderConnectionStatus: "failed"
          }
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [state])

  async function openOptionsRoute(route: OptionsRoutePath) {
    if (actionInFlight) {
      return
    }

    setActionError(null)
    setActionInFlight(true)

    try {
      const response = await sendRuntimeRequest({
        type: "OPEN_OPTIONS_PAGE",
        route
      })

      if (!response.ok) {
        setActionError(response.error || DEFAULT_ACTION_ERROR)
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : DEFAULT_ACTION_ERROR)
    } finally {
      setActionInFlight(false)
    }
  }

  function applySettingsToPopupState(current: PopupStateViewModel, settings: Settings): PopupStateViewModel {
    const resolveEnabled = (sourceId: SourceId, fallbackEnabled: boolean) => {
      const savedEnabled = settings.enabledSources[sourceId]
      return typeof savedEnabled === "boolean" ? savedEnabled : fallbackEnabled
    }

    const nextActiveTab =
      current.activeTab.sourceId === null
        ? current.activeTab
        : {
            ...current.activeTab,
            enabled: resolveEnabled(current.activeTab.sourceId, current.activeTab.enabled)
          }

    return {
      ...current,
      downloaderConnectionStatus: resolveDownloaderConnectionStatus(nextActiveTab),
      activeTab: nextActiveTab,
      supportedSites: current.supportedSites.map((site) => ({
        ...site,
        enabled: resolveEnabled(site.id, site.enabled)
      }))
    }
  }

  async function toggleCurrentSiteEnabled(sourceId: SourceId, enabled: boolean) {
    if (actionInFlight) {
      return
    }

    setActionError(null)
    setActionInFlight(true)

    try {
      const response = await sendRuntimeRequest({
        type: "SET_SOURCE_ENABLED",
        sourceId,
        enabled
      })

      if (!response.ok) {
        setActionError(response.error || DEFAULT_ACTION_ERROR)
        return
      }

      setState((currentState) => {
        if (!currentState) {
          return currentState
        }

        return applySettingsToPopupState(currentState, response.settings)
      })

      await loadState(false, true)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : DEFAULT_ACTION_ERROR)
    } finally {
      setActionInFlight(false)
    }
  }

  if (loading && !state) {
    return (
      <div className="w-[360px] bg-zinc-50 p-3 text-sm text-zinc-600" role="status">
        加载中...
      </div>
    )
  }

  if (loadError && !state) {
    return (
      <div className="w-[360px] space-y-3 bg-zinc-50 p-3 text-zinc-900">
        <Alert tone="error" title={loadError} />
        <Button type="button" onClick={() => void loadState(true)}>
          重试
        </Button>
      </div>
    )
  }

  if (!state) {
    return null
  }

  return (
    <div className="space-y-2">
      {actionError ? <Alert tone="error" title={actionError} /> : null}
      <PopupPage
        actionsDisabled={actionInFlight}
        state={state}
        onOpenGeneralOptions={() => void openOptionsRoute(DEFAULT_OPTIONS_ROUTE)}
        onOpenOptionsRoute={(route) => void openOptionsRoute(route)}
        onToggleCurrentSiteEnabled={(sourceId, enabled) => void toggleCurrentSiteEnabled(sourceId, enabled)}
      />
    </div>
  )
}
