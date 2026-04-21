import { i18n } from "../../../../lib/i18n"
import { useEffect, useId, useState } from "react"
import type { Dispatch, SetStateAction } from "react"

import {
  Badge,
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
  createSubscriptionCondition,
  createSubscriptionDraft,
  getSubscriptionConditionFieldLabel,
  getSubscriptionConditionFieldOptions,
  getSubscriptionValidationError,
  getSubscriptionSourceOptions,
  normalizeSubscriptionDraft,
  summarizeSubscriptionConditionList,
  summarizeSubscriptionSourceIds,
  toggleSubscriptionSourceSelection,
  type SubscriptionWorkbenchCondition,
  type SubscriptionWorkbenchDraft
} from "./subscription-workbench"

type SubscriptionEditorDialogProps = {
  open: boolean
  initialSubscription?: SubscriptionWorkbenchDraft
  onClose: () => void
  onSave: (subscription: SubscriptionWorkbenchDraft) => Promise<void>
  saving?: boolean
}

type ConditionGroupKey = "must" | "any"

export function SubscriptionEditorDialog({
  open,
  initialSubscription,
  onClose,
  onSave,
  saving = false
}: SubscriptionEditorDialogProps) {
  const [draft, setDraft] = useState<SubscriptionWorkbenchDraft>(() => createSubscriptionDraft())
  const [error, setError] = useState("")
  const nameId = useId()
  const titleQueryId = useId()
  const subgroupQueryId = useId()

  useEffect(() => {
    if (!open) {
      return
    }

    setDraft(createSubscriptionDraft(initialSubscription))
    setError("")
  }, [initialSubscription, open])

  const handleAddCondition = (group: ConditionGroupKey) => {
    setDraft((current) => ({
      ...current,
      advanced: {
        ...current.advanced,
        [group]: [...current.advanced[group], createSubscriptionCondition("title")]
      }
    }))
  }

  const handleUpdateCondition = (
    group: ConditionGroupKey,
    id: string,
    updates: Partial<SubscriptionWorkbenchCondition>
  ) => {
    setDraft((current) => ({
      ...current,
      advanced: {
        ...current.advanced,
        [group]: current.advanced[group].map((condition) =>
          condition.id === id
            ? ({ ...condition, ...updates } as SubscriptionWorkbenchCondition)
            : condition
        )
      }
    }))
  }

  const handleRemoveCondition = (group: ConditionGroupKey, id: string) => {
    setDraft((current) => ({
      ...current,
      advanced: {
        ...current.advanced,
        [group]: current.advanced[group].filter((condition) => condition.id !== id)
      }
    }))
  }

  const handleSave = async () => {
    const validationError = getSubscriptionValidationError(draft)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      await onSave(normalizeSubscriptionDraft(draft))
      onClose()
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : i18n.t("options.status.saveFailed"))
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !saving) {
          onClose()
        }
      }}>
      <SheetContent side="right" className="flex h-full w-full max-w-2xl flex-col p-0 sm:max-w-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <SheetHeader className="space-y-0">
            <SheetTitle>
              {initialSubscription
                ? i18n.t("options.subscriptions.dialog.editTitle")
                : i18n.t("options.subscriptions.dialog.addTitle")}
            </SheetTitle>
            <SheetDescription className="sr-only">
              {i18n.t("options.subscriptions.dialog.description")}
            </SheetDescription>
          </SheetHeader>
          <button
            type="button"
            aria-label={i18n.t("options.subscriptions.dialog.close")}
            disabled={saving}
            onClick={() => {
              if (!saving) {
                onClose()
              }
            }}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="space-y-2">
            <Label htmlFor={nameId}>{i18n.t("options.subscriptions.dialog.nameLabel")}</Label>
            <Input
              id={nameId}
              autoFocus
              data-autofocus="true"
              aria-label={i18n.t("options.subscriptions.dialog.nameLabel")}
              placeholder={i18n.t("options.subscriptions.dialog.namePlaceholder")}
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={titleQueryId}>
                {i18n.t("options.subscriptions.dialog.titleQueryLabel")}
              </Label>
              <Input
                id={titleQueryId}
                aria-label={i18n.t("options.subscriptions.dialog.titleQueryLabel")}
                placeholder={i18n.t("options.subscriptions.dialog.titleQueryPlaceholder")}
                value={draft.titleQuery}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, titleQuery: event.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={subgroupQueryId}>
                {i18n.t("options.subscriptions.dialog.subgroupQueryLabel")}
              </Label>
              <Input
                id={subgroupQueryId}
                aria-label={i18n.t("options.subscriptions.dialog.subgroupQueryLabel")}
                placeholder={i18n.t("options.subscriptions.dialog.subgroupQueryPlaceholder")}
                value={draft.subgroupQuery}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, subgroupQuery: event.target.value }))
                }
              />
            </div>
          </div>

          <SourceSelectionSection
            draft={draft}
            onDraftChange={setDraft}
            onError={setError}
          />

          <ConditionSection
            title={i18n.t("options.filters.mustTitle")}
            description={i18n.t("options.subscriptions.dialog.mustDescription")}
            emptyText={i18n.t("options.subscriptions.dialog.mustEmpty")}
            addLabel={i18n.t("options.subscriptions.dialog.addMust")}
            labelPrefix={i18n.t("options.filters.mustPrefix")}
            conditions={draft.advanced.must}
            onAdd={() => handleAddCondition("must")}
            onFieldChange={(id, field) => handleUpdateCondition("must", id, { field })}
            onValueChange={(id, value) => handleUpdateCondition("must", id, { value })}
            onRemove={(id) => handleRemoveCondition("must", id)}
          />

          <ConditionSection
            title={i18n.t("options.filters.anyTitle")}
            description={i18n.t("options.subscriptions.dialog.anyDescription")}
            emptyText={i18n.t("options.subscriptions.dialog.anyEmpty")}
            addLabel={i18n.t("options.subscriptions.dialog.addAny")}
            labelPrefix={i18n.t("options.filters.anyPrefix")}
            conditions={draft.advanced.any}
            onAdd={() => handleAddCondition("any")}
            onFieldChange={(id, field) => handleUpdateCondition("any", id, { field })}
            onValueChange={(id, value) => handleUpdateCondition("any", id, { value })}
            onRemove={(id) => handleRemoveCondition("any", id)}
          />

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-medium text-zinc-900">
              {i18n.t("options.subscriptions.dialog.currentSummary")}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {i18n.t("options.subscriptions.dialog.sourceSummary", [
                summarizeSubscriptionSourceIds(draft.sourceIds)
              ])}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {i18n.t("options.subscriptions.dialog.titleQuerySummary", [
                draft.titleQuery || i18n.t("options.filters.summary.unset")
              ])}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {i18n.t("options.subscriptions.dialog.subgroupQuerySummary", [
                draft.subgroupQuery || i18n.t("options.filters.summary.unset")
              ])}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {i18n.t("options.subscriptions.dialog.mustSummary", [
                summarizeSubscriptionConditionList(draft.advanced.must)
              ])}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              {i18n.t("options.subscriptions.dialog.anySummary", [
                summarizeSubscriptionConditionList(draft.advanced.any)
              ])}
            </p>
          </div>

          <label className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 transition-colors hover:bg-zinc-50">
            <div>
              <div className="text-sm font-medium text-zinc-900">
                {i18n.t("options.subscriptions.dialog.enableTitle")}
              </div>
              <div className="text-xs text-zinc-500">
                {i18n.t("options.subscriptions.dialog.enableDescription")}
              </div>
            </div>
            <Switch
              checked={draft.enabled}
              aria-label={i18n.t("options.subscriptions.dialog.enableTitle")}
              onCheckedChange={(checked) =>
                setDraft((current) => ({ ...current, enabled: checked }))
              }
              disabled={saving}
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
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            {i18n.t("common.cancel")}
          </Button>
          <Button type="button" className="flex-1" onClick={() => void handleSave()} disabled={saving}>
            {saving ? i18n.t("common.processing") : i18n.t("options.subscriptions.dialog.save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SourceSelectionSection({
  draft,
  onDraftChange,
  onError
}: {
  draft: SubscriptionWorkbenchDraft
  onDraftChange: Dispatch<SetStateAction<SubscriptionWorkbenchDraft>>
  onError: (message: string) => void
}) {
  const sourceOptions = getSubscriptionSourceOptions()

  return (
    <section className="space-y-4" data-testid="subscription-source-selection">
      <div className="space-y-4 rounded-xl border border-zinc-200 p-4">
        <label className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-zinc-900">
              {i18n.t("options.subscriptions.dialog.multiSiteModeTitle")}
            </div>
            <p className="text-sm leading-6 text-zinc-500">
              {i18n.t("options.subscriptions.dialog.multiSiteModeDescription")}
            </p>
          </div>
          <Switch
            checked={draft.multiSiteModeEnabled}
            aria-label={i18n.t("options.subscriptions.dialog.multiSiteModeTitle")}
            onCheckedChange={(checked) =>
              onDraftChange((current) => {
                const sourceIds = checked ? current.sourceIds : [current.sourceIds[0] ?? "acgrip"]

                return {
                  ...current,
                  multiSiteModeEnabled: checked,
                  sourceIds
                }
              })
            }
          />
        </label>

        <div>
          <h3 className="text-sm font-semibold text-zinc-900">
            {i18n.t("options.subscriptions.dialog.sourceTitle")}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            {i18n.t("options.subscriptions.dialog.sourceDescription")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {sourceOptions.map((option) => {
            const selected = draft.sourceIds.includes(option.value)

            return (
              <button
                key={option.value}
                type="button"
                data-testid={`subscription-source-tag-${option.value}`}
                aria-pressed={selected}
                onClick={() => {
                  onError("")
                  onDraftChange((current) => {
                    const sourceIds = toggleSubscriptionSourceSelection(
                      current.sourceIds,
                      option.value,
                      current.multiSiteModeEnabled
                    )

                    return {
                      ...current,
                      sourceIds
                    }
                  })
                }}
                className={[
                  "rounded-full border px-3 py-1.5 text-sm transition-colors",
                  selected
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50"
                ].join(" ")}>
                {option.label}
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <Badge variant="muted">
            {i18n.t("options.subscriptions.dialog.sourceCount", [draft.sourceIds.length])}
          </Badge>
          <span>{i18n.t("options.subscriptions.dialog.sourceHint")}</span>
        </div>
      </div>
    </section>
  )
}

type ConditionSectionProps = {
  title: string
  description: string
  emptyText: string
  addLabel: string
  labelPrefix: string
  conditions: SubscriptionWorkbenchCondition[]
  onAdd: () => void
  onFieldChange: (id: string, field: SubscriptionWorkbenchCondition["field"]) => void
  onValueChange: (id: string, value: string) => void
  onRemove: (id: string) => void
}

function ConditionSection({
  title,
  description,
  emptyText,
  addLabel,
  labelPrefix,
  conditions,
  onAdd,
  onFieldChange,
  onValueChange,
  onRemove
}: ConditionSectionProps) {
  const fieldOptions = getSubscriptionConditionFieldOptions()

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
                    <Label className="text-xs text-zinc-500">
                      {i18n.t("options.filters.dialog.fieldLabel")}
                    </Label>
                    <Select
                      value={condition.field}
                      onValueChange={(value: string) =>
                        onFieldChange(idToString(condition.id), value as SubscriptionWorkbenchCondition["field"])
                      }>
                      <SelectTrigger
                        aria-label={i18n.t("options.filters.dialog.fieldAriaLabel", [
                          labelPrefix,
                          index + 1
                        ])}>
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
                      {i18n.t("options.filters.dialog.fieldValueLabel", [
                        getSubscriptionConditionFieldLabel(condition.field)
                      ])}
                    </Label>
                    <Input
                      aria-label={i18n.t("options.filters.dialog.valueAriaLabel", [
                        labelPrefix,
                        index + 1
                      ])}
                      value={condition.value}
                      onChange={(event) => onValueChange(condition.id, event.target.value)}
                      placeholder={i18n.t("options.filters.dialog.valuePlaceholder", [
                        getSubscriptionConditionFieldLabel(condition.field)
                      ])}
                    />
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

function idToString(id: string) {
  return id
}
