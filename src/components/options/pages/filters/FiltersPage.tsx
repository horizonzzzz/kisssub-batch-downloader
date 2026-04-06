import { useState } from "react"

import { useFormContext, useWatch } from "react-hook-form"
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
  Button,
  Card
} from "../../../ui"
import {
  type SettingsFormInput,
  type SettingsFormValues
} from "../../schema/settings-form"
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

export function FiltersPage() {
  const form = useFormContext<SettingsFormInput, unknown, SettingsFormValues>()
  const filters =
    useWatch({
      control: form.control,
      name: "filters"
    }) ?? []
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [creatingFilter, setCreatingFilter] = useState(false)
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)
  const [testInput, setTestInput] = useState<FilterWorkbenchTestInput>({
    title: "",
    source: "kisssub"
  })
  const [testResult, setTestResult] = useState<FilterWorkbenchTestResult | null>(null)

  const setFilters = (nextFilters: FilterWorkbenchFilter[]) => {
    form.setValue("filters", nextFilters, {
      shouldDirty: true,
      shouldTouch: true
    })
  }

  const handleAddPresetFilter = () => {
    const currentFilters = form.getValues("filters") ?? []
    setFilters([...currentFilters, createAilian1080SimplifiedChineseFilter()])
  }

  const handleSaveFilter = (nextFilter: FilterWorkbenchFilter) => {
    const currentFilters = form.getValues("filters") ?? []

    if (editingIndex === null) {
      setFilters([...currentFilters, nextFilter])
    } else {
      setFilters(
        currentFilters.map((filter, index) =>
          index === editingIndex ? nextFilter : filter
        )
      )
    }

    setCreatingFilter(false)
    setEditingIndex(null)
  }

  const handleDeleteFilter = (targetIndex: number) => {
    setFilters(filters.filter((_, index) => index !== targetIndex))
  }

  const handleToggleEnabled = (targetIndex: number, enabled: boolean) => {
    setFilters(
      filters.map((filter, index) =>
        index === targetIndex ? { ...filter, enabled } : filter
      )
    )
  }

  const handleRunTest = () => {
    setTestResult(runWorkbenchTest(testInput, form.getValues("filters") ?? []))
  }

  const enabledFiltersCount = filters.filter((filter) => filter.enabled).length
  const pendingDeleteFilter =
    pendingDeleteIndex !== null ? filters[pendingDeleteIndex] : null

  return (
    <div className="space-y-8" data-testid="filters-workbench">
      <Card>
        <div className="flex flex-col gap-5 px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
                筛选器
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-zinc-500">
                只配置你想保留的资源特征。只要命中任一启用中的筛选器就保留；如果没有启用筛选器，则默认全部保留。
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleAddPresetFilter}>
                <HiOutlinePlus className="h-4 w-4" />
                添加实例规则
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setEditingIndex(null)
                  setCreatingFilter(true)
                }}>
                <HiOutlinePlus className="h-4 w-4" />
                新增筛选器
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-zinc-600">
            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2">
              已配置 <span className="font-medium text-zinc-900">{filters.length}</span> 条筛选器
            </div>
            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2">
              已启用 <span className="font-medium text-zinc-900">{enabledFiltersCount}</span> 条
            </div>
          </div>
        </div>
      </Card>

      <section className="space-y-4" data-testid="filters-list">
        <div>
          <h3 className="text-lg font-semibold text-zinc-900">筛选器列表</h3>
          <p className="mt-1 text-sm leading-6 text-zinc-500">
            推荐一条筛选器对应一个真实场景，例如“爱恋 1080 简繁”。
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
              <h4 className="text-base font-medium text-zinc-900">还没有筛选器</h4>
              <p className="text-sm leading-6 text-zinc-500">
                新增一条筛选器，告诉扩展什么样的资源应该被保留。
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button type="button" variant="outline" onClick={handleAddPresetFilter}>
                  <HiOutlinePlus className="h-4 w-4" />
                  添加实例规则
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setEditingIndex(null)
                    setCreatingFilter(true)
                  }}>
                  <HiOutlinePlus className="h-4 w-4" />
                  开始配置
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
        initialFilter={
          editingIndex !== null ? createFilterDraft(filters[editingIndex]) : undefined
        }
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
            <AlertDialogTitle>删除筛选器</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteFilter
                ? `确定删除筛选器“${pendingDeleteFilter.name}”吗？`
                : "确定删除这条筛选器吗？"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                if (pendingDeleteIndex === null) {
                  return
                }

                handleDeleteFilter(pendingDeleteIndex)
                setPendingDeleteIndex(null)
              }}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
