import { i18n } from "../../../../lib/i18n"
import { useMemo, useState } from "react"

import { HiOutlinePlus } from "react-icons/hi2"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Alert,
  Button,
  Card
} from "../../../ui"
import type { OptionsApi } from "../../OptionsPage"
import { FilterRuleBuilderDialog } from "./FilterRuleBuilderDialog"
import { FilterWorkbenchCard } from "./FilterWorkbenchCards"
import { FilterWorkbenchTestBench } from "./FilterWorkbenchTestBench"
import {
  createAilian1080SimplifiedChineseFilter,
  createFilterDraft,
  runWorkbenchTest,
  type FilterWorkbenchFilter,
  type FilterWorkbenchTestInput,
  type FilterWorkbenchTestResult
} from "./filter-workbench"
import { useFilterWorkbench } from "./use-filter-workbench"

type FiltersPageProps = {
  api: OptionsApi
}

export function FiltersPage({ api }: FiltersPageProps) {
  const { config, setConfig, status, loading, saving, save } = useFilterWorkbench(api)
  const filters = config.rules

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [creatingFilter, setCreatingFilter] = useState(false)
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)
  const [testInput, setTestInput] = useState<FilterWorkbenchTestInput>({
    title: "",
    source: "kisssub"
  })
  const [testResult, setTestResult] = useState<FilterWorkbenchTestResult | null>(null)

  const handleAddPresetFilter = () => {
    setConfig((current) => ({
      ...current,
      rules: [...current.rules, createAilian1080SimplifiedChineseFilter()]
    }))
  }

  const handleSaveFilter = (nextFilter: FilterWorkbenchFilter) => {
    if (editingIndex === null) {
      setConfig((current) => ({
        ...current,
        rules: [...current.rules, nextFilter]
      }))
    } else {
      setConfig((current) => ({
        ...current,
        rules: current.rules.map((filter, index) =>
          index === editingIndex ? nextFilter : filter
        )
      }))
    }

    setCreatingFilter(false)
    setEditingIndex(null)
  }

  const handleDeleteFilter = (targetIndex: number) => {
    setConfig((current) => ({
      ...current,
      rules: current.rules.filter((_, index) => index !== targetIndex)
    }))
  }

  const handleToggleEnabled = (targetIndex: number, enabled: boolean) => {
    setConfig((current) => ({
      ...current,
      rules: current.rules.map((filter, index) =>
        index === targetIndex ? { ...filter, enabled } : filter
      )
    }))
  }

  const handleRunTest = () => {
    setTestResult(runWorkbenchTest(testInput, filters))
  }

  const initialFilter = useMemo(() => {
    if (editingIndex === null) {
      return undefined
    }

    const editingFilter = filters[editingIndex]
    return editingFilter ? createFilterDraft(editingFilter) : undefined
  }, [editingIndex, filters])

  const enabledFiltersCount = filters.filter((filter) => filter.enabled).length
  const pendingDeleteFilter =
    pendingDeleteIndex !== null ? filters[pendingDeleteIndex] : null

  return (
    <div className="space-y-8" data-testid="filters-workbench">
      <div role="status" aria-live="polite">
        <Alert tone={status.tone} title={status.message} />
      </div>

      <Card>
        <div className="flex flex-col gap-5 px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
                {i18n.t("options.filters.title")}
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-zinc-500">
                {i18n.t("options.filters.description")}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleAddPresetFilter} disabled={loading}>
                <HiOutlinePlus className="h-4 w-4" />
                {i18n.t("options.filters.addPreset")}
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setEditingIndex(null)
                  setCreatingFilter(true)
                }}
                disabled={loading}>
                <HiOutlinePlus className="h-4 w-4" />
                {i18n.t("options.filters.add")}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3 text-sm text-zinc-600">
              <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2">
                {i18n.t("options.filters.configuredCount", [filters.length])}
              </div>
              <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2">
                {i18n.t("options.filters.enabledCount", [enabledFiltersCount])}
              </div>
            </div>

            <Button type="button" onClick={() => void save()} disabled={loading || saving}>
              {saving ? i18n.t("common.processing") : i18n.t("options.filters.saveFilters")}
            </Button>
          </div>
        </div>
      </Card>

      <section className="space-y-4" data-testid="filters-list">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">{i18n.t("options.filters.listTitle")}</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            {i18n.t("options.filters.listDescription")}
          </p>
        </div>

        {filters.length ? (
          <div className="grid gap-4">
            {filters.map((filter, index) => (
              <FilterWorkbenchCard
                key={`${filter.id}-${index}`}
                filter={filter}
                onEdit={() => {
                  setCreatingFilter(false)
                  setEditingIndex(index)
                }}
                onDelete={() => setPendingDeleteIndex(index)}
                onToggleEnabled={(enabled) => handleToggleEnabled(index, enabled)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <div className="space-y-4 px-6 py-10 text-center">
              <h4 className="text-base font-medium text-zinc-900">{i18n.t("options.filters.emptyTitle")}</h4>
              <p className="text-sm leading-6 text-zinc-500">
                {i18n.t("options.filters.emptyDescription")}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" onClick={handleAddPresetFilter}>
                  <HiOutlinePlus className="h-4 w-4" />
                  {i18n.t("options.filters.addPreset")}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setEditingIndex(null)
                    setCreatingFilter(true)
                  }}>
                  <HiOutlinePlus className="h-4 w-4" />
                  {i18n.t("options.filters.startConfig")}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </section>

      <FilterWorkbenchTestBench
        value={testInput}
        result={testResult}
        onChange={setTestInput}
        onRun={handleRunTest}
      />

      <FilterRuleBuilderDialog
        open={creatingFilter || editingIndex !== null}
        initialFilter={initialFilter}
        onClose={() => {
          setCreatingFilter(false)
          setEditingIndex(null)
        }}
        onSave={handleSaveFilter}
      />

      <AlertDialog
        open={pendingDeleteIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteIndex(null)
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.t("options.filters.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteFilter
                ? i18n.t("options.filters.deleteDescriptionNamed", [pendingDeleteFilter.name])
                : i18n.t("options.filters.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{i18n.t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                if (pendingDeleteIndex === null) {
                  return
                }

                handleDeleteFilter(pendingDeleteIndex)
                setPendingDeleteIndex(null)
              }}>
              {i18n.t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
