import { i18n } from "../../../../lib/i18n"
import {
  HiOutlineCheckCircle,
  HiOutlinePlay,
  HiOutlineXCircle
} from "react-icons/hi2"

import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../../../ui"
import {
  getSourceOptions,
  type FilterWorkbenchTestInput,
  type FilterWorkbenchTestResult
} from "./filter-workbench"

type FilterWorkbenchTestBenchProps = {
  value: FilterWorkbenchTestInput
  result: FilterWorkbenchTestResult | null
  onChange: (value: FilterWorkbenchTestInput) => void
  onRun: () => void
}

export function FilterWorkbenchTestBench({
  value,
  result,
  onChange,
  onRun
}: FilterWorkbenchTestBenchProps) {
  const sourceOptions = getSourceOptions()

  return (
    <Card>
      <div className="border-b border-zinc-100 px-6 py-5">
        <div className="flex items-center gap-2">
          <HiOutlinePlay className="h-4 w-4 text-blue-600" />
          <h3 className="text-lg font-semibold text-zinc-900">{i18n.t("options.filters.testBench.title")}</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          {i18n.t("options.filters.testBench.description")}
        </p>
      </div>

      <div className="space-y-5 px-6 py-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-2">
            <Label htmlFor="filters-test-title">{i18n.t("options.filters.testBench.titleLabel")}</Label>
            <Input
              id="filters-test-title"
              aria-label={i18n.t("options.filters.testBench.titleLabel")}
              value={value.title}
              onChange={(event) =>
                onChange({
                  ...value,
                  title: event.target.value
                })
              }
              placeholder={i18n.t("options.filters.testBench.titlePlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="filters-test-source">{i18n.t("options.filters.testBench.sourceLabel")}</Label>
            <Select
              value={value.source}
              onValueChange={(source: string) =>
                onChange({
                  ...value,
                  source: source as FilterWorkbenchTestInput["source"]
                })
              }>
              <SelectTrigger id="filters-test-source" aria-label={i18n.t("options.filters.testBench.sourceLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChange({
                  title: "[爱恋字幕社][1月新番][金牌得主 第二季][Medalist][08][1080p][MP4][GB][简中]",
                  source: "kisssub"
                })
              }>
              {i18n.t("options.filters.testBench.presetAilian")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                onChange({
                  title: "[LoliHouse] Summer Pockets 01 [1080p]",
                  source: "kisssub"
                })
              }>
              {i18n.t("options.filters.testBench.presetMiss")}
            </Button>
          </div>

          <Button type="button" onClick={onRun}>
            {i18n.t("options.filters.testBench.run")}
          </Button>
        </div>

        {result ? (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-zinc-700">{i18n.t("options.filters.testBench.resultTitle")}</span>
              {result.state === "result" ? (
                <div
                  className={[
                    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium",
                    result.accepted
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  ].join(" ")}>
                  {result.accepted ? (
                    <HiOutlineCheckCircle className="h-4 w-4" />
                  ) : (
                    <HiOutlineXCircle className="h-4 w-4" />
                  )}
                  {result.label}
                </div>
              ) : (
                <Badge variant="warning">{i18n.t("options.filters.testBench.awaitingInput")}</Badge>
              )}
            </div>

            <p className="mt-4 text-sm leading-6 text-zinc-700">{result.summary}</p>
            {result.subgroup ? (
              <p className="mt-2 text-xs text-zinc-500">
                {i18n.t("options.filters.testBench.detectedSubgroup", [result.subgroup])}
              </p>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">
                {i18n.t("options.filters.testBench.noSubgroup")}
              </p>
            )}
            {result.state === "result" ? (
              <p className="mt-2 text-xs text-zinc-500">
                {result.matchedFilterName
                  ? i18n.t("options.filters.testBench.matchedFilterLabel", [result.matchedFilterName])
                  : i18n.t("options.filters.testBench.noMatchedFilter")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  )
}
