import { i18n } from "../../../../lib/i18n"
import {
  buildSubscriptionHitsWorkbenchRows,
  markSubscriptionHitsViewed,
  type SubscriptionHitsWorkbenchInput,
  type SubscriptionHitsWorkbenchRow
} from "../../../../lib/subscriptions"
import { useLiveQuery } from "dexie-react-hooks"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { OptionsApi } from "../../OptionsPage"
import {
  buildSubscriptionHitWorkbenchViewRows,
  countPendingHits
} from "./subscription-hits-workbench"

export type SubscriptionHitsWorkbenchFeedback = {
  tone: "info" | "success" | "error"
  message: string
} | null

function createInitialInput(): SubscriptionHitsWorkbenchInput {
  return {
    roundId: null,
    searchText: "",
    status: "all",
    sourceId: "all"
  }
}

export function useSubscriptionHitsWorkbench(api: OptionsApi, initialRoundId?: string | null) {
  const [feedback, setFeedback] = useState<SubscriptionHitsWorkbenchFeedback>(null)
  const [downloading, setDownloading] = useState(false)
  const [input, setInput] = useState<SubscriptionHitsWorkbenchInput>(() => ({
    ...createInitialInput(),
    roundId: initialRoundId ?? null
  }))
  const [selectedHitIds, setSelectedHitIds] = useState<Set<string>>(new Set())
  const [submittingHitIds, setSubmittingHitIds] = useState<Set<string>>(new Set())
  const lastScrolledHighlightKeyRef = useRef<string | null>(null)

  const rawWorkbenchRows =
    useLiveQuery(
      () => buildSubscriptionHitsWorkbenchRows(input),
      [input.roundId, input.searchText, input.status, input.sourceId],
      [] as SubscriptionHitsWorkbenchRow[]
    ) ?? []

  const workbenchRows = useMemo(
    () => buildSubscriptionHitWorkbenchViewRows(rawWorkbenchRows, submittingHitIds),
    [rawWorkbenchRows, submittingHitIds]
  )

  const allHits = useMemo(
    () => workbenchRows.flatMap((row) => row.hits),
    [workbenchRows]
  )

  const allHitIds = useMemo(
    () => allHits.map((hit) => hit.id),
    [allHits]
  )

  const selectedCount = selectedHitIds.size
  const totalCount = allHitIds.length
  const firstHighlightedHitId = useMemo(
    () => allHits.find((hit) => hit.highlighted)?.id ?? null,
    [allHits]
  )

  useEffect(() => {
    const nextRoundId = initialRoundId ?? null
    setInput((prev) =>
      prev.roundId === nextRoundId
        ? prev
        : {
            ...prev,
            roundId: nextRoundId
          }
    )
  }, [initialRoundId])

  useEffect(() => {
    setSelectedHitIds((current) => {
      const next = new Set([...current].filter((hitId) => allHitIds.includes(hitId)))
      if (next.size === current.size) {
        return current
      }
      return next
    })
  }, [allHitIds])

  useEffect(() => {
    const unreadHighlightedHitIds = allHits
      .filter((hit) => hit.highlighted && hit.readAt === null)
      .map((hit) => hit.id)

    if (unreadHighlightedHitIds.length === 0) {
      return
    }

    void markSubscriptionHitsViewed(unreadHighlightedHitIds, new Date().toISOString())
  }, [allHits])

  useEffect(() => {
    if (!input.roundId || !firstHighlightedHitId) {
      lastScrolledHighlightKeyRef.current = null
      return
    }

    const highlightKey = `${input.roundId}:${firstHighlightedHitId}`
    if (lastScrolledHighlightKeyRef.current === highlightKey) {
      return
    }

    const rowElement = document.querySelector<HTMLElement>(
      `[data-testid="subscription-hit-row-${firstHighlightedHitId}"]`
    )
    rowElement?.scrollIntoView({
      block: "center",
      behavior: "smooth"
    })
    lastScrolledHighlightKeyRef.current = highlightKey
  }, [firstHighlightedHitId, input.roundId])

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

  const clearSelection = useCallback(() => {
    setSelectedHitIds(new Set())
  }, [])

  const markSubmitting = useCallback((hitIds: string[]) => {
    if (hitIds.length === 0) {
      return
    }

    setSubmittingHitIds((current) => {
      const next = new Set(current)
      for (const hitId of hitIds) {
        next.add(hitId)
      }
      return next
    })
  }, [])

  const clearSubmitting = useCallback((hitIds: string[]) => {
    if (hitIds.length === 0) {
      return
    }

    setSubmittingHitIds((current) => {
      const next = new Set(current)
      for (const hitId of hitIds) {
        next.delete(hitId)
      }
      return next
    })
  }, [])

  const downloadSelectedHits = useCallback(async () => {
    if (selectedHitIds.size === 0) {
      return
    }

    const hitIds = Array.from(selectedHitIds)
    setDownloading(true)
    markSubmitting(hitIds)
    setFeedback({
      tone: "info",
      message: i18n.t("options.subscriptionHits.downloading")
    })

    try {
      const result = await api.downloadSubscriptionHits({
        hitIds,
        roundId: input.roundId
      })
      setFeedback({
        tone: "success",
        message: i18n.t("options.subscriptionHits.downloadSuccess", [
          String(result.submittedHits),
          String(result.duplicateHits),
          String(result.failedHits)
        ])
      })
      clearSelection()
    } catch (error: unknown) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : i18n.t("options.subscriptionHits.downloadFailed")
      })
    } finally {
      clearSubmitting(hitIds)
      setDownloading(false)
    }
  }, [selectedHitIds, api, clearSelection, clearSubmitting, markSubmitting])

  const downloadSingleHit = useCallback(async (hitId: string) => {
    setDownloading(true)
    markSubmitting([hitId])
    setFeedback({
      tone: "info",
      message: i18n.t("options.subscriptionHits.downloading")
    })

    try {
      const result = await api.downloadSubscriptionHits({
        hitIds: [hitId],
        roundId: input.roundId
      })
      setFeedback({
        tone: "success",
        message: i18n.t("options.subscriptionHits.downloadSuccess", [
          String(result.submittedHits),
          String(result.duplicateHits),
          String(result.failedHits)
        ])
      })
    } catch (error: unknown) {
      setFeedback({
        tone: "error",
        message: error instanceof Error ? error.message : i18n.t("options.subscriptionHits.downloadFailed")
      })
    } finally {
      clearSubmitting([hitId])
      setDownloading(false)
    }
  }, [api, clearSubmitting, markSubmitting])

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

  const summary = useMemo(
    () => ({
      totalHits: totalCount,
      pendingHits: countPendingHits(allHits),
      newHits: allHits.filter((hit) => hit.displayStatus === "new").length,
      submittedHits: allHits.filter((hit) => hit.displayStatus === "submitted").length,
      failedHits: allHits.filter((hit) => hit.displayStatus === "failed").length,
      highlightedHits: allHits.filter((hit) => hit.highlighted).length,
      subscriptionCount: workbenchRows.length
    }),
    [allHits, totalCount, workbenchRows.length]
  )

  return {
    feedback,
    loading: false,
    downloading,
    workbenchRows,
    input,
    selectedHitIds,
    selectedCount,
    totalCount,
    firstHighlightedHitId,
    summary,
    toggleHitSelection,
    clearSelection,
    downloadSelectedHits,
    downloadSingleHit,
    setSearchText,
    setStatusFilter,
    setSourceFilter
  }
}
