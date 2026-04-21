import { i18n } from "../../../../lib/i18n"
import {
  buildSubscriptionHitsWorkbenchRows,
  type SubscriptionHitsWorkbenchInput,
  type SubscriptionHitsWorkbenchRow
} from "../../../../lib/subscriptions/hits-query"
import { useLiveQuery } from "dexie-react-hooks"
import { useCallback, useMemo, useState } from "react"

import type { OptionsApi } from "../../OptionsPage"

export type SubscriptionHitsWorkbenchStatus = {
  tone: "info" | "success" | "error"
  message: string
}

function createInitialInput(): SubscriptionHitsWorkbenchInput {
  return {
    roundId: null,
    searchText: "",
    status: "all",
    sourceId: "all"
  }
}

export function useSubscriptionHitsWorkbench(api: OptionsApi, initialRoundId?: string | null) {
  const [status, setStatus] = useState<SubscriptionHitsWorkbenchStatus>({
    tone: "info",
    message: i18n.t("options.status.loadingSettings")
  })
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [input, setInput] = useState<SubscriptionHitsWorkbenchInput>(() => ({
    ...createInitialInput(),
    roundId: initialRoundId ?? null
  }))
  const [selectedHitIds, setSelectedHitIds] = useState<Set<string>>(new Set())

  const workbenchRows =
    useLiveQuery(
      () => buildSubscriptionHitsWorkbenchRows(input),
      [input.roundId, input.searchText, input.status, input.sourceId],
      [] as SubscriptionHitsWorkbenchRow[]
    ) ?? []

  const allHitIds = useMemo(
    () => workbenchRows.flatMap((row) => row.hits.map((hit) => hit.id)),
    [workbenchRows]
  )

  const selectedCount = selectedHitIds.size
  const totalCount = allHitIds.length
  const isAllSelected = totalCount > 0 && selectedHitIds.size === totalCount

  const toggleHitSelection = useCallback((hitId: string) => {
    setSelectedHitIds((prev) => {
      const next = new Set(prev)
      if (next.has(hitId)) {
        next.delete(hitId)
      } else {
        next.add(hitId)
      }
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedHitIds(new Set())
    } else {
      setSelectedHitIds(new Set(allHitIds))
    }
  }, [isAllSelected, allHitIds])

  const clearSelection = useCallback(() => {
    setSelectedHitIds(new Set())
  }, [])

  const downloadSelectedHits = useCallback(async () => {
    if (selectedHitIds.size === 0) {
      return
    }

    setDownloading(true)
    setStatus({
      tone: "info",
      message: i18n.t("options.subscriptionHits.downloading")
    })

    try {
      const result = await api.downloadSubscriptionHits(Array.from(selectedHitIds))
      setStatus({
        tone: "success",
        message: i18n.t("options.subscriptionHits.downloadSuccess", [
          String(result.submittedHits),
          String(result.duplicateHits),
          String(result.failedHits)
        ])
      })
      clearSelection()
    } catch (error: unknown) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : i18n.t("options.status.saveFailed")
      })
    } finally {
      setDownloading(false)
    }
  }, [selectedHitIds, api, clearSelection])

  const downloadSingleHit = useCallback(async (hitId: string) => {
    setDownloading(true)
    setStatus({
      tone: "info",
      message: i18n.t("options.subscriptionHits.downloading")
    })

    try {
      const result = await api.downloadSubscriptionHits([hitId])
      setStatus({
        tone: "success",
        message: i18n.t("options.subscriptionHits.downloadSuccess", [
          String(result.submittedHits),
          String(result.duplicateHits),
          String(result.failedHits)
        ])
      })
    } catch (error: unknown) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : i18n.t("options.status.saveFailed")
      })
    } finally {
      setDownloading(false)
    }
  }, [api])

  const setSearchText = useCallback((text: string) => {
    setInput((prev) => ({ ...prev, searchText: text }))
  }, [])

  const setStatusFilter = useCallback(
    (filter: SubscriptionHitsWorkbenchInput["status"]) => {
      setInput((prev) => ({ ...prev, status: filter }))
    },
    []
  )

  const setSourceFilter = useCallback(
    (sourceId: SubscriptionHitsWorkbenchInput["sourceId"]) => {
      setInput((prev) => ({ ...prev, sourceId }))
    },
    []
  )

  const setRoundId = useCallback((roundId: string | null) => {
    setInput((prev) => ({ ...prev, roundId }))
  }, [])

  const summary = useMemo(
    () => ({
      totalHits: totalCount,
      pendingHits: workbenchRows
        .flatMap((row) => row.hits)
        .filter((hit) => hit.downloadStatus === "idle").length,
      highlightedHits: workbenchRows.flatMap((row) => row.hits).filter((hit) => hit.highlighted).length,
      subscriptionCount: workbenchRows.length
    }),
    [workbenchRows, totalCount]
  )

  return {
    status,
    loading,
    downloading,
    workbenchRows,
    input,
    selectedHitIds,
    selectedCount,
    totalCount,
    isAllSelected,
    summary,
    toggleHitSelection,
    toggleSelectAll,
    clearSelection,
    downloadSelectedHits,
    downloadSingleHit,
    setSearchText,
    setStatusFilter,
    setSourceFilter,
    setRoundId
  }
}