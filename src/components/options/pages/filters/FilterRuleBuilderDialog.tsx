import { useEffect, useId, useState } from "react"

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Switch
} from "../../../ui"
import {
  HiOutlineExclamationCircle,
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineXMark
} from "react-icons/hi2"

import {
  ANY_CONDITION_FIELD_OPTIONS,
  MUST_CONDITION_FIELD_OPTIONS,
  SOURCE_OPTIONS,
  createCondition,
  createFilterDraft,
  getConditionFieldLabel,
  normalizeConditionField,
  summarizeConditionList,
  type FilterWorkbenchCondition,
  type FilterWorkbenchTextCondition,
  type FilterWorkbenchFilter
} from "./filter-workbench"

type FilterRuleBuilderDialogProps = {
  open: boolean
  initialFilter?: FilterWorkbenchFilter
  onClose: () => void
  onSave: (filter: FilterWorkbenchFilter) => void
}

type ConditionGroupKey = "must" | "any"

export function FilterRuleBuilderDialog({
  open,
  initialFilter,
  onClose,
  onSave
}: FilterRuleBuilderDialogProps) {
  const [filter, setFilter] = useState<FilterWorkbenchFilter>(() => createFilterDraft())
  const [error, setError] = useState("")
  const nameId = useId()

  useEffect(() => {
    if (!open) {
      return
    }

    setFilter(createFilterDraft(initialFilter))
    setError("")
  }, [initialFilter, open])

  const addCondition = (group: ConditionGroupKey) => {
    setFilter((current) => ({
      ...current,
      [group]: [...current[group], createCondition("title")]
    }))
  }

  const removeCondition = (group: ConditionGroupKey, id: string) => {
    setFilter((current) => ({
      ...current,
      [group]: current[group].filter((condition) => condition.id !== id)
    }))
  }

  const updateCondition = (
    group: ConditionGroupKey,
    id: string,
    updates: Partial<FilterWorkbenchCondition>
  ) => {
    setFilter((current) => ({
      ...current,
      [group]: current[group].map((condition) =>
        condition.id === id ? { ...condition, ...updates } as FilterWorkbenchCondition : condition
      )
    }))
  }

  const updateConditionField = (
    group: ConditionGroupKey,
    id: string,
    field: FilterWorkbenchCondition["field"]
  ) => {
    setFilter((current) => ({
      ...current,
      [group]: current[group].map((condition) =>
        condition.id === id ? normalizeConditionField(field, condition) : condition
      )
    }))
  }

  const handleSave = () => {
    if (!filter.name.trim()) {
      setError("请输入筛选器名称")
      return
    }

    if (!filter.must.length) {
      setError("至少需要一个必须满足条件")
      return
    }

    const conditions = [...filter.must, ...filter.any]
    if (conditions.some((condition) => !condition.value.trim())) {
      setError("每个条件都需要填写条件值")
      return
    }

    onSave({
      ...filter,
      name: filter.name.trim(),
      must: filter.must.map(normalizeConditionValue),
      any: filter.any.map(normalizeTextConditionValue)
    })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) {
          onClose()
        }
      }}>
      <SheetContent side="right" className="flex h-full w-full max-w-2xl flex-col p-0 sm:max-w-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <SheetHeader className="space-y-0">
            <SheetTitle>{initialFilter ? "编辑筛选器" : "新增筛选器"}</SheetTitle>
            <SheetDescription className="sr-only">
              编辑筛选器名称、条件和启用状态
            </SheetDescription>
          </SheetHeader>
          <SheetClose asChild>
            <button
              type="button"
              aria-label="关闭筛选器面板"
              className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600">
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </SheetClose>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="space-y-2">
            <Label htmlFor={nameId}>筛选器名称</Label>
            <Input
              id={nameId}
              autoFocus
              data-autofocus="true"
              aria-label="筛选器名称"
              value={filter.name}
              onChange={(event) =>
                setFilter((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="例如：爱恋 1080 简繁"
            />
          </div>

          <ConditionSection
            title="必须满足"
            labelPrefix="必须"
            description="这些条件需要全部命中。"
            emptyText="还没有必须满足条件。"
            fieldOptions={MUST_CONDITION_FIELD_OPTIONS}
            conditions={filter.must}
            addLabel="添加必须条件"
            onAdd={() => addCondition("must")}
            onFieldChange={(id, field) => updateConditionField("must", id, field)}
            onValueChange={(id, value) => updateCondition("must", id, { value })}
            onRemove={(id) => removeCondition("must", id)}
          />

          <ConditionSection
            title="满足任一"
            labelPrefix="任一"
            description="可选；只要其中一条命中即可，不用于限定站点范围。"
            emptyText="未设置额外的“任一”条件。"
            fieldOptions={ANY_CONDITION_FIELD_OPTIONS}
            conditions={filter.any}
            addLabel="添加任一条件"
            onAdd={() => addCondition("any")}
            onFieldChange={(id, field) => updateConditionField("any", id, field)}
            onValueChange={(id, value) => updateCondition("any", id, { value })}
            onRemove={(id) => removeCondition("any", id)}
          />

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-zinc-900">当前摘要</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              必须满足：{summarizeConditionList(filter.must)}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              满足任一：{summarizeConditionList(filter.any)}
            </p>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 transition-colors hover:bg-zinc-50">
            <div>
              <div className="text-sm font-medium text-zinc-900">启用筛选器</div>
              <div className="text-xs text-zinc-500">
                停用后保留配置，但不会参与实际筛选。
              </div>
            </div>
            <Switch
              checked={filter.enabled}
              onCheckedChange={(checked) =>
                setFilter((current) => ({ ...current, enabled: checked }))
              }
              aria-label="启用筛选器"
            />
          </label>

          {error ? (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
              <HiOutlineExclamationCircle className="h-4 w-4" />
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex gap-3 border-t border-zinc-100 bg-zinc-50 p-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button type="button" className="flex-1" onClick={handleSave}>
            保存筛选器
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

type ConditionSectionProps = {
  title: string
  labelPrefix: string
  description: string
  emptyText: string
  addLabel: string
  fieldOptions: ReadonlyArray<{
    value: FilterWorkbenchCondition["field"]
    label: string
  }>
  conditions: FilterWorkbenchCondition[]
  onAdd: () => void
  onFieldChange: (id: string, field: FilterWorkbenchCondition["field"]) => void
  onValueChange: (id: string, value: string) => void
  onRemove: (id: string) => void
}

function ConditionSection({
  title,
  labelPrefix,
  description,
  emptyText,
  addLabel,
  fieldOptions,
  conditions,
  onAdd,
  onFieldChange,
  onValueChange,
  onRemove
}: ConditionSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <HiOutlinePlus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>

      {conditions.length ? (
        <div className="space-y-3">
          {conditions.map((condition, index) => (
            <div key={condition.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-medium text-zinc-500">
                  {index + 1}
                </div>
                <div className="grid flex-1 gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-500">字段</Label>
                    <Select
                      value={condition.field}
                      onValueChange={(value: string) =>
                        onFieldChange(idToString(condition.id), value as FilterWorkbenchCondition["field"])
                      }>
                      <SelectTrigger aria-label={`${labelPrefix}条件字段 ${index + 1}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-500">
                      {condition.field === "source" ? "站点" : `${getConditionFieldLabel(condition.field)}内容`}
                    </Label>
                    {condition.field === "source" ? (
                      <Select
                        value={condition.value}
                        onValueChange={(value: string) => onValueChange(condition.id, value)}>
                        <SelectTrigger aria-label={`${labelPrefix}条件值 ${index + 1}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SOURCE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        aria-label={`${labelPrefix}条件值 ${index + 1}`}
                        value={condition.value}
                        onChange={(event) => onValueChange(condition.id, event.target.value)}
                        placeholder={`输入${getConditionFieldLabel(condition.field)}关键词`}
                      />
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`删除条件 ${index + 1}`}
                  onClick={() => onRemove(condition.id)}>
                  <HiOutlineTrash className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500">
          {emptyText}
        </div>
      )}
    </section>
  )
}

function normalizeConditionValue(condition: FilterWorkbenchCondition): FilterWorkbenchCondition {
  if (condition.field === "source") {
    return {
      ...condition,
      value: condition.value
    }
  }

  return {
    ...condition,
    value: condition.value.trim()
  }
}

function normalizeTextConditionValue(
  condition: FilterWorkbenchTextCondition
): FilterWorkbenchTextCondition {
  return {
    ...condition,
    value: condition.value.trim()
  }
}

function idToString(id: string) {
  return id
}
