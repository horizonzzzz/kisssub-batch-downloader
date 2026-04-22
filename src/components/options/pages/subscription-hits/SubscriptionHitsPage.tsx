import { i18n } from "../../../../lib/i18n"
import type { SubscriptionHitsWorkbenchInput } from "../../../../lib/subscriptions/hits-query"
import { HiOutlineArrowDownCircle, HiOutlineCheckCircle } from "react-icons/hi2"

import { Alert, Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui"
import type { OptionsApi } from "../../OptionsPage"
import { SubscriptionHitGroupCard } from "./SubscriptionHitGroupCard"
import { useSubscriptionHitsWorkbench } from "./use-subscription-hits-workbench"

type SubscriptionHitsPageProps = {
  api: OptionsApi
  initialRoundId?: string | null
}

const STATUS_FILTER_OPTIONS: Array<{
  value: SubscriptionHitsWorkbenchInput["status"]
  label: string
}> = [
  { value: "all", label: "options.subscriptionHits.filterAll" },
  { value: "pending", label: "options.subscriptionHits.filterPending" },
  { value: "new", label: "options.subscriptionHits.filterNew" },
  { value: "failed", label: "options.subscriptionHits.filterFailed" },
  { value: "processed", label: "options.subscriptionHits.filterProcessed" }
]

const SOURCE_FILTER_OPTIONS: Array<{
  value: SubscriptionHitsWorkbenchInput["sourceId"]
  label: string
}> = [
  { value: "all", label: "options.subscriptionHits.filterAll" },
  { value: "acgrip", label: "ACG.RIP" },
  { value: "bangumimoe", label: "Bangumi.moe" }
]

export function SubscriptionHitsPage({ api, initialRoundId }: SubscriptionHitsPageProps) {
  const {
    feedback,
    downloading,
    workbenchRows,
    input,
    selectedHitIds,
    selectedCount,
    summary,
    toggleHitSelection,
    downloadSelectedHits,
    downloadSingleHit,
    setSearchText,
    setStatusFilter,
    setSourceFilter
  } = useSubscriptionHitsWorkbench(api, initialRoundId)

  return (
    <div className="space-y-6" data-testid="subscription-hits-workbench">
      <section
        className="rounded-2xl border border-zinc-200 bg-white px-5 py-4"
        data-testid="subscription-hits-toolbar">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            <Input
              type="search"
              placeholder={i18n.t("options.subscriptionHits.searchPlaceholder")}
              value={input.searchText}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchText(event.target.value)}
              className="w-full lg:w-[240px]"
            />

            <Select
              value={input.status}
              onValueChange={(value: string) =>
                setStatusFilter(value as SubscriptionHitsWorkbenchInput["status"])
              }>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {i18n.t(option.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={input.sourceId}
              onValueChange={(value: string) =>
                setSourceFilter(value as SubscriptionHitsWorkbenchInput["sourceId"])
              }>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value === "all" ? i18n.t(option.label) : option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 self-end xl:self-auto">
            {selectedCount > 0 && (
              <span className="text-sm text-zinc-600">
                {i18n.t("options.subscriptionHits.selectedCount", [String(selectedCount)])}
              </span>
            )}
            <Button
              type="button"
              size="sm"
              disabled={downloading || selectedHitIds.size === 0}
              onClick={() => void downloadSelectedHits()}>
              {downloading ? (
                <HiOutlineArrowDownCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <HiOutlineCheckCircle className="h-4 w-4" aria-hidden="true" />
              )}
              {downloading
                ? i18n.t("common.processing")
                : i18n.t("options.subscriptionHits.downloadSelected")}
            </Button>
          </div>
        </div>

        {feedback ? (
          <div className="mt-3" role="status" aria-live="polite">
            <Alert tone={feedback.tone} title={feedback.message} />
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard
          label={i18n.t("options.subscriptionHits.summaryPending")}
          value={summary.pendingHits}
          testId="subscription-hit-summary-pending"
        />
        <SummaryCard
          label={i18n.t("options.subscriptionHits.summaryNew")}
          value={summary.newHits}
          testId="subscription-hit-summary-new"
        />
        <SummaryCard
          label={i18n.t("options.subscriptionHits.summarySubmitted")}
          value={summary.submittedHits}
          testId="subscription-hit-summary-submitted"
        />
        <SummaryCard
          label={i18n.t("options.subscriptionHits.summaryFailed")}
          value={summary.failedHits}
          testId="subscription-hit-summary-failed"
        />
        <SummaryCard
          label={i18n.t("options.subscriptionHits.summaryHighlighted")}
          value={summary.highlightedHits}
          testId="subscription-hit-summary-highlighted"
        />
      </section>

      <section className="space-y-4" data-testid="subscription-hits-list">
        {workbenchRows.length > 0 ? (
          <div className="grid gap-4">
            {workbenchRows.map((row) => (
              <SubscriptionHitGroupCard
                key={row.subscription.id}
                row={row}
                selectedHitIds={selectedHitIds}
                downloading={downloading}
                onToggleHitSelection={toggleHitSelection}
                onDownloadHit={downloadSingleHit}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="space-y-4 px-5 py-10 text-center">
              <h4 className="text-base font-medium text-zinc-900">
                {i18n.t("options.subscriptionHits.noHits")}
              </h4>
              <p className="text-sm leading-6 text-zinc-500">
                {i18n.t("options.subscriptionHits.noHitsDescription")}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  testId
}: {
  label: string
  value: number
  testId: string
}) {
  return (
    <div
      className="rounded-xl border border-zinc-200 bg-white px-4 py-3"
      data-testid={testId}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-zinc-900">{value}</div>
    </div>
  )
}
