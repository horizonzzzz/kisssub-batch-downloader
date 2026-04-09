import { i18n } from "../../../../lib/i18n"
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
  getAnyConditionFieldOptions,
  getMustConditionFieldOptions,
  getSourceOptions,
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
  const mustConditionFieldOptions = getMustConditionFieldOptions()
  const anyConditionFieldOptions = getAnyConditionFieldOptions()
  const sourceOptions = getSourceOptions()

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
      setError(i18n.t("options.validation.filterNameRequired"))
      return
    }

    if (!filter.must.length) {
      setError(i18n.t("options.filters.dialog.mustConditionRequired"))
      return
    }

    const conditions = [...filter.must, ...filter.any]
    if (conditions.some((condition) => !condition.value.trim())) {
      setError(i18n.t("options.filters.dialog.conditionValueRequired"))
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
            <SheetTitle>{initialFilter ? i18n.t("options.filters.dialog.editTitle") : i18n.t("options.filters.dialog.addTitle")}</SheetTitle>
            <SheetDescription className="sr-only">
              {i18n.t("options.filters.dialog.description")}
            </SheetDescription>
          </SheetHeader>
          <SheetClose asChild>
            <button
              type="button"
              aria-label={i18n.t("options.filters.dialog.close")}
              className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600">
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </SheetClose>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="space-y-2">
            <Label htmlFor={nameId}>{i18n.t("options.filters.dialog.nameLabel")}</Label>
            <Input
              id={nameId}
              autoFocus
              data-autofocus="true"
              aria-label={i18n.t("options.filters.dialog.nameLabel")}
              value={filter.name}
              onChange={(event) =>
                setFilter((current) => ({ ...current, name: event.target.value }))
              }
              placeholder={i18n.t("options.filters.dialog.namePlaceholder")}
            />
          </div>

          <ConditionSection
            title={i18n.t("options.filters.mustTitle")}
            labelPrefix={i18n.t("options.filters.mustPrefix")}
            description={i18n.t("options.filters.dialog.mustDescription")}
            emptyText={i18n.t("options.filters.dialog.mustEmpty")}
            fieldOptions={mustConditionFieldOptions}
            conditions={filter.must}
            addLabel={i18n.t("options.filters.dialog.addMust")}
            onAdd={() => addCondition("must")}
            onFieldChange={(id, field) => updateConditionField("must", id, field)}
            onValueChange={(id, value) => updateCondition("must", id, { value })}
            onRemove={(id) => removeCondition("must", id)}
          />

          <ConditionSection
            title={i18n.t("options.filters.anyTitle")}
            labelPrefix={i18n.t("options.filters.anyPrefix")}
            description={i18n.t("options.filters.dialog.anyDescription")}
            emptyText={i18n.t("options.filters.dialog.anyEmpty")}
            fieldOptions={anyConditionFieldOptions}
            conditions={filter.any}
            addLabel={i18n.t("options.filters.dialog.addAny")}
            onAdd={() => addCondition("any")}
            onFieldChange={(id, field) => updateConditionField("any", id, field)}
            onValueChange={(id, value) => updateCondition("any", id, { value })}
            onRemove={(id) => removeCondition("any", id)}
          />

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-zinc-900">{i18n.t("options.filters.dialog.currentSummary")}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {i18n.t("options.filters.dialog.mustSummary", [summarizeConditionList(filter.must)])}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {i18n.t("options.filters.dialog.anySummary", [summarizeConditionList(filter.any)])}
            </p>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 transition-colors hover:bg-zinc-50">
            <div>
              <div className="text-sm font-medium text-zinc-900">{i18n.t("options.filters.dialog.enableTitle")}</div>
              <div className="text-xs text-zinc-500">
                {i18n.t("options.filters.dialog.enableDescription")}
              </div>
            </div>
            <Switch
              checked={filter.enabled}
              onCheckedChange={(checked) =>
                setFilter((current) => ({ ...current, enabled: checked }))
              }
              aria-label={i18n.t("options.filters.dialog.enableTitle")}
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
            {i18n.t("common.cancel")}
          </Button>
          <Button type="button" className="flex-1" onClick={handleSave}>
            {i18n.t("options.filters.dialog.save")}
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
  const sourceOptions = getSourceOptions()

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
                    <Label className="text-xs text-zinc-500">{i18n.t("options.filters.dialog.fieldLabel")}</Label>
                    <Select
                      value={condition.field}
                      onValueChange={(value: string) =>
                        onFieldChange(idToString(condition.id), value as FilterWorkbenchCondition["field"])
                      }>
                      <SelectTrigger aria-label={i18n.t("options.filters.dialog.fieldAriaLabel", [labelPrefix, index + 1])}>
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
                      {condition.field === "source"
                        ? i18n.t("options.filters.field.source")
                        : i18n.t("options.filters.dialog.fieldValueLabel", [getConditionFieldLabel(condition.field)])}
                    </Label>
                    {condition.field === "source" ? (
                      <Select
                        value={condition.value}
                        onValueChange={(value: string) => onValueChange(condition.id, value)}>
                        <SelectTrigger aria-label={i18n.t("options.filters.dialog.valueAriaLabel", [labelPrefix, index + 1])}>
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
                    ) : (
                      <Input
                        aria-label={i18n.t("options.filters.dialog.valueAriaLabel", [labelPrefix, index + 1])}
                        value={condition.value}
                        onChange={(event) => onValueChange(condition.id, event.target.value)}
                        placeholder={i18n.t("options.filters.dialog.valuePlaceholder", [getConditionFieldLabel(condition.field)])}
                      />
                    )}
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={i18n.t("options.filters.dialog.removeCondition", [index + 1])}
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
