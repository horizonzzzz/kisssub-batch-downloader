import { useState } from "react"

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from "@dnd-kit/sortable"
import { HiOutlineInformationCircle, HiOutlinePlus } from "react-icons/hi2"

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
import { FilterGroupDialog } from "./FilterGroupDialog"
import { FilterRuleBuilderDialog } from "./FilterRuleBuilderDialog"
import { FilterWorkbenchGroupCard } from "./FilterWorkbenchCards"
import { FilterWorkbenchTestBench } from "./FilterWorkbenchTestBench"
import {
  cloneWorkbenchRule,
  createPresetGroup,
  runPrototypeWorkbenchTest,
  type FilterWorkbenchGroup,
  type FilterWorkbenchRule,
  type FilterWorkbenchTestInput,
  type FilterWorkbenchTestResult
} from "./filter-workbench"

type PendingDeleteRule = {
  groupIndex: number
  ruleIndex: number
}

type RuleEditorState = {
  groupIndex: number
  ruleIndex: number | null
}

export function FiltersPage() {
  const [groups, setGroups] = useState<FilterWorkbenchGroup[]>([])
  const [editingGroupIndex, setEditingGroupIndex] = useState<number | null>(null)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [editingRule, setEditingRule] = useState<RuleEditorState | null>(null)
  const [pendingDeleteGroupIndex, setPendingDeleteGroupIndex] = useState<
    number | null
  >(null)
  const [pendingDeleteRule, setPendingDeleteRule] =
    useState<PendingDeleteRule | null>(null)
  const [testInput, setTestInput] = useState<FilterWorkbenchTestInput>({
    title: "",
    source: "kisssub",
    subgroup: ""
  })
  const [testResult, setTestResult] = useState<FilterWorkbenchTestResult | null>(
    null
  )
  const groupSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const enabledGroupsCount = groups.filter((group) => group.enabled).length
  const totalRulesCount = groups.reduce(
    (count, group) => count + group.rules.length,
    0
  )

  const handleGroupDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = groups.findIndex((group) => group.id === active.id)
    const newIndex = groups.findIndex((group) => group.id === over.id)

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
      return
    }

    setGroups((current) => arrayMove(current, oldIndex, newIndex))
  }

  const handleSaveGroup = (group: FilterWorkbenchGroup) => {
    setGroups((current) => {
      if (editingGroupIndex === null) {
        return [...current, group]
      }

      return current.map((entry, index) =>
        index === editingGroupIndex ? group : entry
      )
    })
    setCreatingGroup(false)
    setEditingGroupIndex(null)
  }

  const handleDeleteGroup = (groupIndex: number) => {
    setGroups((current) =>
      current.filter((_, currentIndex) => currentIndex !== groupIndex)
    )
  }

  const handleSaveRule = (target: RuleEditorState, rule: FilterWorkbenchRule) => {
    setGroups((current) =>
      current.map((group, groupIndex) => {
        if (groupIndex !== target.groupIndex) {
          return group
        }

        if (target.ruleIndex === null) {
          return {
            ...group,
            rules: [...group.rules, rule]
          }
        }

        return {
          ...group,
          rules: group.rules.map((entry, ruleIndex) =>
            ruleIndex === target.ruleIndex ? rule : entry
          )
        }
      })
    )
    setEditingRule(null)
  }

  const handleDeleteRule = (groupIndex: number, ruleIndex: number) => {
    setGroups((current) =>
      current.map((group, currentIndex) => {
        if (currentIndex !== groupIndex) {
          return group
        }

        return {
          ...group,
          rules: group.rules.filter((_, currentRuleIndex) => currentRuleIndex !== ruleIndex)
        }
      })
    )
  }

  const handleCopyRule = (groupIndex: number, ruleIndex: number) => {
    setGroups((current) =>
      current.map((group, currentIndex) => {
        if (currentIndex !== groupIndex) {
          return group
        }

        const originalRule = group.rules[ruleIndex]
        if (!originalRule) {
          return group
        }

        const copiedRule = cloneWorkbenchRule(originalRule)
        const nextRules = [...group.rules]
        nextRules.splice(ruleIndex + 1, 0, copiedRule)

        return {
          ...group,
          rules: nextRules
        }
      })
    )
  }

  const handleToggleGroupEnabled = (groupIndex: number, enabled: boolean) => {
    setGroups((current) =>
      current.map((group, currentIndex) =>
        currentIndex === groupIndex ? { ...group, enabled } : group
      )
    )
  }

  const handleToggleRuleEnabled = (
    groupIndex: number,
    ruleIndex: number,
    enabled: boolean
  ) => {
    setGroups((current) =>
      current.map((group, currentIndex) => {
        if (currentIndex !== groupIndex) {
          return group
        }

        return {
          ...group,
          rules: group.rules.map((rule, currentRuleIndex) =>
            currentRuleIndex === ruleIndex ? { ...rule, enabled } : rule
          )
        }
      })
    )
  }

  const handleReorderRules = (
    groupIndex: number,
    reorderedRules: FilterWorkbenchRule[]
  ) => {
    setGroups((current) =>
      current.map((group, currentIndex) =>
        currentIndex === groupIndex
          ? { ...group, rules: reorderedRules }
          : group
      )
    )
  }

  const handleImportPreset = () => {
    setGroups((current) => [...current, createPresetGroup()])
  }

  const handleRunPrototypeTest = () => {
    setTestResult(runPrototypeWorkbenchTest(testInput, groups))
  }

  const pendingDeleteGroup =
    pendingDeleteGroupIndex !== null ? groups[pendingDeleteGroupIndex] : null
  const pendingDeleteRuleValue =
    pendingDeleteRule !== null
      ? groups[pendingDeleteRule.groupIndex]?.rules[pendingDeleteRule.ruleIndex]
      : null

  return (
    <div className="space-y-8" data-testid="filters-workbench">
      <Card>
        <div className="flex flex-col gap-5 px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">
                  策略工作台
                </h2>
                <Badge variant="warning">原型阶段</Badge>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-zinc-500">
                过滤模块正在迁移为“策略组 + 规则构建器”信息架构。本页仅承载最终交互原型和本地临时态演示，便于后续接入真实规则引擎。
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={handleImportPreset}>
                从模板库导入
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setEditingGroupIndex(null)
                  setCreatingGroup(true)
                }}>
                <HiOutlinePlus className="h-4 w-4" />
                新建策略组
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              默认策略：<span className="font-medium text-zinc-900">放行</span>
            </div>
            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              已启用 <span className="font-medium text-zinc-900">{enabledGroupsCount}</span> 个策略组
            </div>
            <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              共 <span className="font-medium text-zinc-900">{totalRulesCount}</span> 条规则
            </div>
            {testResult?.state === "result" ? (
              <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
                最近测试：
                <span
                  className={[
                    "ml-1 font-medium",
                    testResult.accepted ? "text-emerald-700" : "text-rose-700"
                  ].join(" ")}>
                  {testResult.label}
                </span>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
            当前页面的增删改拖拽只在本次会话内生效，不会写回现有的 `filterRules`
            设置，也不会影响后台批量提交流程。
          </div>
        </div>
      </Card>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)]">
        <section className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900">
                执行策略编排
              </h3>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                从上到下整理策略组和组内规则，优先保证原型中的布局、分层与操作反馈。
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <HiOutlineInformationCircle className="h-4 w-4" />
              命中即停止的真实执行逻辑将在后续版本接入。
            </div>
          </div>

          {groups.length === 0 ? (
            <Card>
              <div className="grid gap-4 px-6 py-10 text-center">
                <h4 className="text-base font-medium text-zinc-900">
                  还没有策略组
                </h4>
                <p className="text-sm leading-6 text-zinc-500">
                  先创建一个策略组，或者导入模板库里的原型样例，开始搭建新的过滤工作台。
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button type="button" variant="outline" onClick={handleImportPreset}>
                    从模板库导入
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setEditingGroupIndex(null)
                      setCreatingGroup(true)
                    }}>
                    <HiOutlinePlus className="h-4 w-4" />
                    开始创建策略组
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <DndContext
              sensors={groupSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleGroupDragEnd}>
              <SortableContext
                items={groups.map((group) => group.id)}
                strategy={verticalListSortingStrategy}>
                <div className="grid gap-4">
                  {groups.map((group, groupIndex) => (
                    <FilterWorkbenchGroupCard
                      key={group.id}
                      group={group}
                      index={groupIndex}
                      onEdit={() => {
                        setCreatingGroup(false)
                        setEditingGroupIndex(groupIndex)
                      }}
                      onDelete={() => setPendingDeleteGroupIndex(groupIndex)}
                      onToggleEnabled={(enabled) =>
                        handleToggleGroupEnabled(groupIndex, enabled)
                      }
                      onAddRule={() =>
                        setEditingRule({
                          groupIndex,
                          ruleIndex: null
                        })
                      }
                      onEditRule={(ruleIndex) =>
                        setEditingRule({
                          groupIndex,
                          ruleIndex
                        })
                      }
                      onDeleteRule={(ruleIndex) =>
                        setPendingDeleteRule({
                          groupIndex,
                          ruleIndex
                        })
                      }
                      onCopyRule={(ruleIndex) =>
                        handleCopyRule(groupIndex, ruleIndex)
                      }
                      onToggleRuleEnabled={(ruleIndex, enabled) =>
                        handleToggleRuleEnabled(groupIndex, ruleIndex, enabled)
                      }
                      onReorderRules={(rules) =>
                        handleReorderRules(groupIndex, rules)
                      }
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </section>

        <FilterWorkbenchTestBench
          value={testInput}
          result={testResult}
          onChange={setTestInput}
          onRun={handleRunPrototypeTest}
        />
      </div>

      <FilterGroupDialog
        open={creatingGroup || editingGroupIndex !== null}
        initialGroup={
          editingGroupIndex !== null ? groups[editingGroupIndex] : undefined
        }
        onClose={() => {
          setCreatingGroup(false)
          setEditingGroupIndex(null)
        }}
        onSave={handleSaveGroup}
      />

      <FilterRuleBuilderDialog
        open={editingRule !== null}
        initialRule={
          editingRule !== null && editingRule.ruleIndex !== null
            ? groups[editingRule.groupIndex]?.rules[editingRule.ruleIndex]
            : undefined
        }
        onClose={() => setEditingRule(null)}
        onSave={(rule) => {
          if (!editingRule) {
            return
          }

          handleSaveRule(editingRule, rule)
        }}
      />

      <AlertDialog
        open={pendingDeleteGroupIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteGroupIndex(null)
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除策略组</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteGroup
                ? `确定删除策略组“${pendingDeleteGroup.name}”以及其下的全部本地规则吗？`
                : "确定删除这个策略组吗？"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                if (pendingDeleteGroupIndex === null) {
                  return
                }

                handleDeleteGroup(pendingDeleteGroupIndex)
                setPendingDeleteGroupIndex(null)
              }}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingDeleteRule !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteRule(null)
          }
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除规则</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteRuleValue
                ? `确定删除规则“${pendingDeleteRuleValue.name || "未命名规则"}”吗？`
                : "确定删除这条规则吗？"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                if (!pendingDeleteRule) {
                  return
                }

                handleDeleteRule(
                  pendingDeleteRule.groupIndex,
                  pendingDeleteRule.ruleIndex
                )
                setPendingDeleteRule(null)
              }}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
