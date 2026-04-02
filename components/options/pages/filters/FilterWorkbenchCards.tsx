import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"
import {
  HiOutlineBars3,
  HiOutlineDocumentDuplicate,
  HiOutlinePencilSquare,
  HiOutlinePlus,
  HiOutlineTrash
} from "react-icons/hi2"

import { Badge, Button, Switch } from "../../../ui"
import {
  summarizeWorkbenchRule,
  type FilterWorkbenchGroup,
  type FilterWorkbenchRule
} from "./filter-workbench"

type RuleCardProps = {
  rule: FilterWorkbenchRule
  onEdit: () => void
  onDelete: () => void
  onCopy: () => void
  onToggleEnabled: (enabled: boolean) => void
}

type GroupCardProps = {
  group: FilterWorkbenchGroup
  index: number
  onEdit: () => void
  onDelete: () => void
  onToggleEnabled: (enabled: boolean) => void
  onAddRule: () => void
  onEditRule: (ruleIndex: number) => void
  onDeleteRule: (ruleIndex: number) => void
  onCopyRule: (ruleIndex: number) => void
  onToggleRuleEnabled: (ruleIndex: number, enabled: boolean) => void
  onReorderRules: (rules: FilterWorkbenchRule[]) => void
}

function RuleCard({
  rule,
  onEdit,
  onDelete,
  onCopy,
  onToggleEnabled
}: RuleCardProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: rule.id
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}>
      <div
        className={[
          "rounded-xl border bg-white p-4 shadow-sm transition-all",
          isDragging ? "border-blue-300 shadow-lg" : "border-zinc-200",
          rule.enabled ? "" : "opacity-60"
        ].join(" ")}>
        <div className="flex items-start gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            ref={setActivatorNodeRef}
            aria-label={`拖动规则 ${rule.name || "未命名规则"}`}
            {...attributes}
            {...listeners}>
            <HiOutlineBars3 className="h-4 w-4" />
          </Button>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={rule.action === "include" ? "brand" : "warning"}>
                {rule.action === "include" ? "优先放行" : "直接拦截"}
              </Badge>
              <span className="text-sm font-semibold text-zinc-900">
                {rule.name || "未命名规则"}
              </span>
              <Badge variant={rule.enabled ? "success" : "muted"}>
                {rule.enabled ? "已启用" : "已停用"}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-zinc-600">
              {summarizeWorkbenchRule(rule)}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`编辑规则 ${rule.name || "未命名规则"}`}
              onClick={onEdit}>
              <HiOutlinePencilSquare className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`复制规则 ${rule.name || "未命名规则"}`}
              onClick={onCopy}>
              <HiOutlineDocumentDuplicate className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`删除规则 ${rule.name || "未命名规则"}`}
              onClick={onDelete}>
              <HiOutlineTrash className="h-4 w-4" />
            </Button>
            <Switch
              aria-label={`${rule.name || "未命名规则"} 启用开关`}
              checked={rule.enabled}
              onCheckedChange={onToggleEnabled}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export function FilterWorkbenchGroupCard({
  group,
  index,
  onEdit,
  onDelete,
  onToggleEnabled,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onCopyRule,
  onToggleRuleEnabled,
  onReorderRules
}: GroupCardProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: group.id
  })
  const ruleSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleRuleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = group.rules.findIndex((rule) => rule.id === active.id)
    const newIndex = group.rules.findIndex((rule) => rule.id === over.id)

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
      return
    }

    onReorderRules(arrayMove(group.rules, oldIndex, newIndex))
  }

  const enabledRulesCount = group.rules.filter((rule) => rule.enabled).length

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition
      }}
      className="relative">
      <div
        className={[
          "rounded-2xl border bg-zinc-50/60 p-5 transition-all",
          isDragging ? "border-blue-300 shadow-lg" : "border-zinc-200",
          group.enabled ? "" : "opacity-70"
        ].join(" ")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              ref={setActivatorNodeRef}
              aria-label={`拖动策略组 ${group.name}`}
              {...attributes}
              {...listeners}>
              <HiOutlineBars3 className="h-4 w-4" />
            </Button>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-zinc-900">
                  {group.name}
                </h3>
                <Badge variant="brand">策略组</Badge>
                <Badge variant="muted">优先级 {index + 1}</Badge>
              </div>
              {group.description ? (
                <p className="text-sm leading-6 text-zinc-600">
                  {group.description}
                </p>
              ) : null}
              <p className="text-xs text-zinc-500">
                包含 {group.rules.length} 条规则，已启用 {enabledRulesCount} 条
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onAddRule}>
              <HiOutlinePlus className="h-4 w-4" />
              添加规则
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`编辑策略组 ${group.name}`}
              onClick={onEdit}>
              <HiOutlinePencilSquare className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`删除策略组 ${group.name}`}
              onClick={onDelete}>
              <HiOutlineTrash className="h-4 w-4" />
            </Button>
            <Switch
              aria-label={`${group.name} 启用开关`}
              checked={group.enabled}
              onCheckedChange={onToggleEnabled}
            />
          </div>
        </div>

        {group.rules.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-zinc-300 bg-white/80 px-4 py-8 text-center">
            <p className="text-sm font-medium text-zinc-900">该策略组下还没有规则</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              先添加一条规则，用于构建原型演示用的命中路径和说明文案。
            </p>
            <div className="mt-4">
              <Button type="button" variant="secondary" size="sm" onClick={onAddRule}>
                <HiOutlinePlus className="h-4 w-4" />
                添加第一条规则
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <DndContext
              sensors={ruleSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleRuleDragEnd}>
              <SortableContext
                items={group.rules.map((rule) => rule.id)}
                strategy={verticalListSortingStrategy}>
                <div className="grid gap-3">
                  {group.rules.map((rule, ruleIndex) => (
                    <RuleCard
                      key={rule.id}
                      rule={rule}
                      onEdit={() => onEditRule(ruleIndex)}
                      onDelete={() => onDeleteRule(ruleIndex)}
                      onCopy={() => onCopyRule(ruleIndex)}
                      onToggleEnabled={(enabled) =>
                        onToggleRuleEnabled(ruleIndex, enabled)
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>
    </div>
  )
}
