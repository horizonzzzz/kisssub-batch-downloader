import { useEffect, useId, useMemo, useState } from "react"

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
  createEmptyCondition,
  createRuleDraft,
  getConditionFieldLabel,
  getConditionOperatorOptions,
  getConditionOperatorLabel,
  SOURCE_OPTIONS,
  type FilterWorkbenchCondition,
  type FilterWorkbenchConditionField,
  type FilterWorkbenchConditionOperator,
  type FilterWorkbenchConditionRelation,
  type FilterWorkbenchRule
} from "./filter-workbench"

type FilterRuleBuilderDialogProps = {
  open: boolean
  initialRule?: FilterWorkbenchRule
  onClose: () => void
  onSave: (rule: FilterWorkbenchRule) => void
}

export function FilterRuleBuilderDialog({
  open,
  initialRule,
  onClose,
  onSave
}: FilterRuleBuilderDialogProps) {
  const [rule, setRule] = useState<FilterWorkbenchRule>(() => createRuleDraft())
  const [error, setError] = useState("")
  const nameId = useId()

  useEffect(() => {
    if (!open) {
      return
    }

    setRule(createRuleDraft(initialRule))
    setError("")
  }, [initialRule, open])

  const heading = useMemo(
    () => (initialRule ? "编辑规则" : "新建规则"),
    [initialRule]
  )

  const addCondition = () => {
    setRule((current) => ({
      ...current,
      conditions: [...current.conditions, createEmptyCondition()]
    }))
  }

  const removeCondition = (id: string) => {
    setRule((current) => ({
      ...current,
      conditions: current.conditions.filter((condition) => condition.id !== id)
    }))
  }

  const updateCondition = (
    id: string,
    updates: Partial<FilterWorkbenchCondition>
  ) => {
    setRule((current) => ({
      ...current,
      conditions: current.conditions.map((condition) =>
        condition.id === id ? { ...condition, ...updates } : condition
      )
    }))
  }

  const updateConditionField = (
    id: string,
    field: FilterWorkbenchConditionField
  ) => {
    setRule((current) => ({
      ...current,
      conditions: current.conditions.map((condition) => {
        if (condition.id !== id) {
          return condition
        }

        const nextOperatorOptions = getConditionOperatorOptions(field)
        const operatorIsSupported = nextOperatorOptions.some(
          (option) => option.value === condition.operator
        )

        return {
          ...condition,
          field,
          operator: operatorIsSupported ? condition.operator : nextOperatorOptions[0]!.value
        }
      })
    }))
  }

  const generatePreview = () => {
    if (!rule.conditions.length) {
      return "暂无条件，请至少添加一个匹配条件。"
    }

    const relationText = rule.relation === "and" ? "且" : "或"
    const conditionsText = rule.conditions
      .map((condition) => {
        const field = getConditionFieldLabel(condition.field)
        const operator = getConditionOperatorLabel(condition.operator)
        const value = condition.value.trim() || "..."
        return `${field} ${operator} "${value}"`
      })
      .join(` ${relationText} `)

    const actionText =
      rule.action === "include" ? "匹配放行（保留）" : "匹配拦截"

    return `当 ${conditionsText} 时，执行${actionText}。`
  }

  const handleSave = () => {
    if (!rule.name.trim()) {
      setError("请输入规则名称")
      return
    }

    if (rule.conditions.length === 0) {
      setError("至少需要一个条件")
      return
    }

    if (rule.conditions.some((condition) => !condition.value.trim())) {
      setError("每个条件都需要填写条件值")
      return
    }

    const invalidSourceCondition = rule.conditions.find(
      (condition) =>
        condition.field === "source" &&
        !SOURCE_OPTIONS.some(
          (option) => option.value === condition.value.trim().toLowerCase()
        )
    )
    if (invalidSourceCondition) {
      setError("站点条件值必须是受支持的 SourceId，例如 kisssub 或 acgrip")
      return
    }

    const invalidRegexCondition = rule.conditions.find(
      (condition) => condition.operator === "regex" && !isValidRegex(condition.value)
    )
    if (invalidRegexCondition) {
      setError("请输入有效的正则表达式")
      return
    }

    onSave({
      ...rule,
      name: rule.name.trim(),
      conditions: rule.conditions.map((condition) => ({
        ...condition,
        value:
          condition.field === "source"
            ? condition.value.trim().toLowerCase()
            : condition.value.trim()
      }))
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
            <SheetTitle>{heading}</SheetTitle>
            <SheetDescription className="sr-only">
              编辑规则动作、条件关系和匹配条件
            </SheetDescription>
          </SheetHeader>
          <SheetClose asChild>
            <button
              type="button"
              aria-label="关闭规则面板"
              className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600">
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </SheetClose>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor={nameId}>规则名称</Label>
              <Input
                id={nameId}
                data-autofocus="true"
                autoFocus
                aria-label="规则名称"
                value={rule.name}
                onChange={(event) =>
                  setRule((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="例如：排除 RAW"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-rule-action">执行动作</Label>
              <Select
                value={rule.action}
                onValueChange={(value: string) =>
                  setRule((current) => ({
                    ...current,
                    action: value as FilterWorkbenchRule["action"]
                  }))
                }>
                <SelectTrigger id="filter-rule-action" aria-label="执行动作">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="exclude">匹配拦截</SelectItem>
                  <SelectItem value="include">匹配放行（保留）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-rule-relation">条件关系</Label>
              <Select
                value={rule.relation}
                onValueChange={(value: string) =>
                  setRule((current) => ({
                    ...current,
                    relation: value as FilterWorkbenchConditionRelation
                  }))
                }>
                <SelectTrigger id="filter-rule-relation" aria-label="条件关系">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="and">全部满足（AND）</SelectItem>
                  <SelectItem value="or">满足任一（OR）</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="h-px w-full bg-zinc-100" />

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">匹配条件</h3>
              <button
                type="button"
                onClick={addCondition}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100">
                <HiOutlinePlus className="h-3.5 w-3.5" />
                添加条件
              </button>
            </div>

            <div className="space-y-3">
              {rule.conditions.map((condition, index) => (
                <div key={condition.id} className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-medium text-zinc-500 shadow-sm">
                    {index + 1}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-nowrap">
                    <span className="shrink-0 text-sm text-zinc-500">当</span>

                    <div className="w-28 shrink-0">
                      <Select
                        value={condition.field}
                        onValueChange={(value: string) =>
                          updateConditionField(
                            condition.id,
                            value as FilterWorkbenchConditionField
                          )
                        }>
                        <SelectTrigger
                          aria-label={`条件字段 ${index + 1}`}
                          className="h-9 rounded-lg border-zinc-300 text-sm focus:ring-indigo-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="title">标题</SelectItem>
                          <SelectItem value="subgroup">字幕组</SelectItem>
                          <SelectItem value="source">站点</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-36 shrink-0">
                      <Select
                        value={condition.operator}
                        onValueChange={(value: string) =>
                          updateCondition(condition.id, {
                            operator: value as FilterWorkbenchConditionOperator
                          })
                        }>
                        <SelectTrigger
                          aria-label={`条件操作 ${index + 1}`}
                          className="h-9 rounded-lg border-zinc-300 text-sm focus:ring-indigo-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getConditionOperatorOptions(condition.field).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Input
                      aria-label={`条件值 ${index + 1}`}
                      value={condition.value}
                      onChange={(event) =>
                        updateCondition(condition.id, {
                          value: event.target.value
                        })
                      }
                      placeholder="输入条件值..."
                      className="h-9 min-w-[12rem] flex-1 rounded-lg border border-zinc-300 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="shrink-0 text-sm text-zinc-500">时</span>
                  </div>

                  <button
                    type="button"
                    aria-label={`删除条件 ${index + 1}`}
                    onClick={() => removeCondition(condition.id)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-50 hover:text-rose-600">
                    <HiOutlineTrash className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {rule.conditions.length === 0 && (
                <div className="rounded-xl border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-500">
                  暂无条件，请先添加一个条件。
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <h4 className="mb-2 text-xs font-semibold text-indigo-900">规则语义预览</h4>
              <p className="text-sm text-indigo-700 leading-relaxed">{generatePreview()}</p>
            </div>

            <label className="flex items-center justify-between rounded-xl border border-zinc-200 p-4 transition-colors hover:bg-zinc-50">
              <div>
                <div className="text-sm font-medium text-zinc-900">启用规则</div>
                <div className="text-xs text-zinc-500">停用后保留配置，但不会参与测试台或后台真实过滤。</div>
              </div>
              <Switch
                checked={rule.enabled}
                onCheckedChange={(checked) =>
                  setRule((current) => ({ ...current, enabled: checked }))
                }
                aria-label="启用规则"
              />
            </label>
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
                <HiOutlineExclamationCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 border-t border-zinc-100 bg-zinc-50 p-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button type="button" className="flex-1" onClick={handleSave}>
            保存规则
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function isValidRegex(value: string) {
  try {
    new RegExp(value)
    return true
  } catch {
    return false
  }
}
