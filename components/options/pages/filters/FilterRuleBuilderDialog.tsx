import { useEffect, useId, useMemo, useState } from "react"

import { Button, Input, Label, Switch } from "../../../ui"
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
  getConditionOperatorLabel,
  type FilterWorkbenchCondition,
  type FilterWorkbenchConditionField,
  type FilterWorkbenchConditionOperator,
  type FilterWorkbenchConditionRelation,
  type FilterWorkbenchRule
} from "./filter-workbench"
import { useSheetAccessibility } from "./useSheetAccessibility"

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
  const titleId = useId()
  const nameId = useId()
  const panelRef = useSheetAccessibility(open, onClose)

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

  const generatePreview = () => {
    if (!rule.conditions.length) {
      return "暂无条件，保存后可作为原型示例规则展示。"
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
      rule.action === "include" ? "优先放行" : "直接拦截"

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

    onSave({
      ...rule,
      name: rule.name.trim()
    })
    onClose()
  }

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-zinc-900/30 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-zinc-900">
            {heading}
          </h2>
          <button
            type="button"
            aria-label="关闭规则面板"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600">
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor={nameId}>规则名称</Label>
              <Input
                id={nameId}
                data-autofocus="true"
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
              <select
                id="filter-rule-action"
                value={rule.action}
                aria-label="执行动作"
                onChange={(event) =>
                  setRule((current) => ({
                    ...current,
                    action: event.target.value as FilterWorkbenchRule["action"]
                  }))
                }
                className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="exclude">直接拦截（仅界面原型）</option>
                <option value="include">优先放行（仅界面原型）</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filter-rule-relation">条件关系</Label>
              <select
                id="filter-rule-relation"
                value={rule.relation}
                aria-label="条件关系"
                onChange={(event) =>
                  setRule((current) => ({
                    ...current,
                    relation:
                      event.target.value as FilterWorkbenchConditionRelation
                  }))
                }
                className="w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                <option value="and">全部满足（AND）</option>
                <option value="or">满足任一（OR）</option>
              </select>
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

                  <div className="flex flex-1 items-center gap-2">
                    <span className="text-sm text-zinc-500">当</span>
                    <select
                      aria-label={`条件字段 ${index + 1}`}
                      value={condition.field}
                      onChange={(event) =>
                        updateCondition(condition.id, {
                          field:
                            event.target.value as FilterWorkbenchConditionField
                        })
                      }
                      className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <option value="title">标题</option>
                      <option value="subgroup">字幕组</option>
                      <option value="source">站点</option>
                    </select>

                    <select
                      aria-label={`条件操作 ${index + 1}`}
                      value={condition.operator}
                      onChange={(event) =>
                        updateCondition(condition.id, {
                          operator:
                            event.target.value as FilterWorkbenchConditionOperator
                        })
                      }
                      className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <option value="contains">包含</option>
                      <option value="not_contains">不包含</option>
                      <option value="is">等于</option>
                      <option value="is_not">不等于</option>
                      <option value="regex">正则匹配</option>
                    </select>

                    <Input
                      aria-label={`条件值 ${index + 1}`}
                      value={condition.value}
                      onChange={(event) =>
                        updateCondition(condition.id, {
                          value: event.target.value
                        })
                      }
                      placeholder="输入条件值..."
                      className="h-9 flex-1 rounded-lg border border-zinc-300 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-zinc-500">时</span>
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
                <div className="text-xs text-zinc-500">仅影响当前页面原型演示，不会写入真实过滤配置。</div>
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
      </div>
    </div>
  )
}
