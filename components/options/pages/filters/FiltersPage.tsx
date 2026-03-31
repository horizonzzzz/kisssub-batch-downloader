import { useState } from "react"

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { useFieldArray, useFormContext } from "react-hook-form"
import { HiOutlineArrowDown, HiOutlineArrowUp, HiOutlineBars3, HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2"

import type { FilterRule } from "../../../../lib/shared/types"
import type { SettingsFormInput } from "../../schema/settings-form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card
} from "../../../ui"
import { FilterRuleDialog } from "./FilterRuleDialog"

function describeRule(rule: FilterRule): string[] {
  const sections: string[] = []

  if (rule.conditions.titleIncludes.length > 0) {
    sections.push(`标题包含：${rule.conditions.titleIncludes.join(", ")}`)
  }

  if (rule.conditions.titleExcludes.length > 0) {
    sections.push(`标题排除：${rule.conditions.titleExcludes.join(", ")}`)
  }

  if (rule.conditions.subgroupIncludes.length > 0) {
    sections.push(`字幕组：${rule.conditions.subgroupIncludes.join(", ")}`)
  }

  return sections
}

type SortableFilterRuleCardProps = {
  rule: FilterRule
  index: number
  total: number
  onMove: (index: number, direction: -1 | 1) => void
  onEdit: () => void
  onDelete: () => void
  onToggleEnabled: (enabled: boolean) => void
}

function SortableFilterRuleCard({
  rule,
  index,
  total,
  onMove,
  onEdit,
  onDelete,
  onToggleEnabled
}: SortableFilterRuleCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: rule.id
    })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}>
      <Card className={isDragging ? "opacity-80 shadow-lg" : undefined}>
        <div className="flex flex-col gap-4 px-6 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-medium text-zinc-900">{rule.name}</h3>
              <Badge variant={rule.enabled ? "success" : "muted"}>
                {rule.enabled ? "已启用" : "已停用"}
              </Badge>
              <Badge variant={rule.action === "exclude" ? "warning" : "brand"}>
                {rule.action === "exclude" ? "排除" : "保留"}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-zinc-600">
              {describeRule(rule).map((item) => (
                <span key={item} className="rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1.5">
                  {item}
                </span>
              ))}
            </div>

            <p className="text-xs text-zinc-500">生效站点：{rule.sourceIds.join(", ")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`拖拽排序 ${rule.name}`}
              ref={setActivatorNodeRef}
              {...attributes}
              {...listeners}>
              <HiOutlineBars3 className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`上移 ${rule.name}`}
              disabled={index === 0}
              onClick={() => onMove(index, -1)}>
              <HiOutlineArrowUp className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`下移 ${rule.name}`}
              disabled={index === total - 1}
              onClick={() => onMove(index, 1)}>
              <HiOutlineArrowDown className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" aria-label={`编辑 ${rule.name}`} onClick={onEdit}>
              <HiOutlinePencilSquare className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="sm" aria-label={`删除 ${rule.name}`} onClick={onDelete}>
              <HiOutlineTrash className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={rule.enabled ? "secondary" : "outline"}
              size="sm"
              onClick={() => onToggleEnabled(!rule.enabled)}>
              {rule.enabled ? "停用" : "启用"}
            </Button>
          </div>
        </div>
        </div>
      </Card>
    </div>
  )
}

export function FiltersPage() {
  const { control, getValues, setValue } = useFormContext<SettingsFormInput>()
  const { fields, replace, update, move } = useFieldArray({
    control,
    name: "filterRules",
    keyName: "fieldKey"
  })
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const reindexRules = (rules: FilterRule[]) =>
    rules.map((rule, index) => ({
      ...rule,
      order: index
    }))

  const handleToggleEnabled = (index: number, enabled: boolean) => {
    const current = getValues(`filterRules.${index}`)
    if (!current) {
      return
    }

    update(index, {
      ...current,
      enabled
    })
  }

  const handleMove = (index: number, direction: -1 | 1) => {
    const currentRules = getValues("filterRules") as FilterRule[]
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= currentRules.length) {
      return
    }

    const reordered = reindexRules(arrayMove(currentRules, index, nextIndex))
    move(index, nextIndex)
    setValue("filterRules", reordered, { shouldDirty: true })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const currentRules = getValues("filterRules") as FilterRule[]
    const oldIndex = currentRules.findIndex((rule) => rule.id === active.id)
    const newIndex = currentRules.findIndex((rule) => rule.id === over.id)

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
      return
    }

    const reordered = reindexRules(arrayMove(currentRules, oldIndex, newIndex))
    replace(reordered)
    setValue("filterRules", reordered, { shouldDirty: true })
  }

  const handleDelete = (index: number) => {
    const nextRules = reindexRules(
      (getValues("filterRules") as FilterRule[]).filter((_, currentIndex) => currentIndex !== index)
    )
    replace(nextRules)
    setValue("filterRules", nextRules, { shouldDirty: true })
  }

  const handleUpdateRule = (index: number, rule: FilterRule) => {
    update(index, rule)
    setValue("filterRules", reindexRules(getValues("filterRules") as FilterRule[]), {
      shouldDirty: true
    })
  }

  const handleAppendRule = (rule: FilterRule) => {
    const nextRules = reindexRules([...(getValues("filterRules") as FilterRule[]), rule])
    replace(nextRules)
    setValue("filterRules", nextRules, { shouldDirty: true })
  }

  const pendingDeleteRule = pendingDeleteIndex !== null ? ((getValues(`filterRules.${pendingDeleteIndex}`) as FilterRule) ?? null) : null

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 px-6 py-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-medium text-zinc-900">提交前自动筛选</h2>
            <p className="text-sm leading-6 text-zinc-500">
              规则会按列表顺序依次执行；同一规则内所有已填写条件都满足时才命中，后命中的规则会覆盖前面的结果。
            </p>
          </div>
          <Button type="button" onClick={() => setCreating(true)}>
            新建规则
          </Button>
        </div>
      </Card>

      {fields.length === 0 ? (
        <Card>
          <div className="grid gap-3 px-6 py-8 text-center">
            <h3 className="text-base font-medium text-zinc-900">还没有过滤规则</h3>
            <p className="text-sm leading-6 text-zinc-500">
              先创建第一条规则，例如排除 RAW 或优先保留特定字幕组。
            </p>
          </div>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={fields.map((field) => field.id)}
            strategy={verticalListSortingStrategy}>
            <div className="grid gap-4">
              {fields.map((field, index) => {
                const rule = getValues(`filterRules.${index}`) as FilterRule

                return (
                  <SortableFilterRuleCard
                    key={(field as FilterRule & { fieldKey: string }).fieldKey}
                    rule={rule}
                    index={index}
                    total={fields.length}
                    onMove={handleMove}
                    onEdit={() => setEditingIndex(index)}
                    onDelete={() => setPendingDeleteIndex(index)}
                    onToggleEnabled={(enabled) => handleToggleEnabled(index, enabled)}
                  />
                )
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <FilterRuleDialog
        open={creating}
        order={fields.length}
        onClose={() => setCreating(false)}
        onSave={handleAppendRule}
      />

      <FilterRuleDialog
        open={editingIndex !== null}
        initialRule={editingIndex !== null ? ((getValues(`filterRules.${editingIndex}`) as FilterRule) ?? undefined) : undefined}
        order={editingIndex ?? 0}
        onClose={() => setEditingIndex(null)}
        onSave={(rule) => {
          if (editingIndex === null) {
            return
          }

          handleUpdateRule(editingIndex, rule)
        }}
      />

      <AlertDialog open={pendingDeleteIndex !== null} onOpenChange={(open) => !open && setPendingDeleteIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除过滤规则</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteRule
                ? `确定删除规则“${pendingDeleteRule.name}”吗？此操作不可恢复。`
                : "确定删除这条过滤规则吗？此操作不可恢复。"}
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

                handleDelete(pendingDeleteIndex)
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
