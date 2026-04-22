import { i18n } from "../../../../lib/i18n"
import type { SubscriptionHitsWorkbenchInput } from "../../../../lib/subscriptions/hits-query"
import { HiOutlineArrowDownCircle, HiOutlineCheckCircle } from "react-icons/hi2"

import { Alert, Button, Card, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../ui"
import { useOptionsPageFooter } from "../../layout/OptionsPageFooter"
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

  const footerConfig = {
    description: i18n.t("options.footer.currentPageDescription"),
    actions: (
      <Button
        type="button"
        size="lg"
        className="min-w-[168px] sm:min-w-[208px]"
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
    )
  }

  useOptionsPageFooter(footerConfig)

  return (
    <div className="space-y-6" data-testid="subscription-hits-workbench">
      {feedback ? (
        <div role="status" aria-live="polite">
          <Alert tone={feedback.tone} title={feedback.message} />
        </div>
      ) : null}

      <header>
        <h2 className="text-xl font-semibold text-zinc-900">
          {i18n.t("options.subscriptionHits.title")}
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {i18n.t("options.subscriptionHits.description")}
        </p>
      </header>

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

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            type="search"
            placeholder={i18n.t("options.subscriptionHits.searchPlaceholder")}
            value={input.searchText}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchText(event.target.value)}
            className="w-full sm:w-[240px]"
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

        <div className="flex items-center gap-3">
          {selectedCount > 0 && (
            <span className="text-sm text-zinc-600">
              {i18n.t("options.subscriptionHits.selectedCount", [String(selectedCount)])}
            </span>
          )}
        </div>
      </div>

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
          <Card>
            <div className="space-y-4 px-6 py-10 text-center">
              <h4 className="text-base font-medium text-zinc-900">
                {i18n.t("options.subscriptionHits.noHits")}
              </h4>
              <p className="text-sm leading-6 text-zinc-500">
                {i18n.t("options.subscriptionHits.noHitsDescription")}
              </p>
            </div>
          </Card>
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
    <Card data-testid={testId}>
      <div className="space-y-1 px-5 py-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {label}
        </div>
        <div className="text-2xl font-semibold text-zinc-900">{value}</div>
      </div>
    </Card>
  )
}
