import { useEffect, useMemo, useState } from "react"

import {
  Button,
  Input,
  Label,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Switch,
  Textarea
} from "../../../ui"
import { HiOutlineExclamationCircle, HiOutlineXMark } from "react-icons/hi2"

import {
  createGroupDraft,
  toWorkbenchGroup,
  type FilterWorkbenchGroup,
  type FilterWorkbenchGroupDraft
} from "./filter-workbench"

type FilterGroupDialogProps = {
  open: boolean
  initialGroup?: FilterWorkbenchGroup
  onClose: () => void
  onSave: (group: FilterWorkbenchGroup) => void
}

export function FilterGroupDialog({ open, initialGroup, onClose, onSave }: FilterGroupDialogProps) {
  const [group, setGroup] = useState<FilterWorkbenchGroupDraft>(() =>
    createGroupDraft()
  )
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) {
      return
    }
    setGroup(createGroupDraft(initialGroup))
    setError("")
  }, [initialGroup, open])

  const headerTitle = useMemo(
    () => (initialGroup ? "编辑策略组" : "新建策略组"),
    [initialGroup]
  )

  const handleSave = () => {
    if (!group.name.trim()) {
      setError("请输入策略组名称")
      return
    }

    onSave(toWorkbenchGroup(group, initialGroup))
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
      <SheetContent side="right" className="flex h-full w-full max-w-md flex-col p-0 sm:max-w-md">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <SheetHeader className="space-y-0">
            <SheetTitle>{headerTitle}</SheetTitle>
            <SheetDescription className="sr-only">
              编辑策略组的基本信息和启用状态
            </SheetDescription>
          </SheetHeader>
          <SheetClose asChild>
            <button
              type="button"
              aria-label="关闭策略组面板"
              className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600">
              <HiOutlineXMark className="h-5 w-5" />
            </button>
          </SheetClose>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <div className="space-y-2">
            <Label htmlFor="filter-group-name">策略组名称</Label>
            <Input
              id="filter-group-name"
              data-autofocus="true"
              autoFocus
              aria-label="策略组名称"
              value={group.name}
              onChange={(event) =>
                setGroup((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="例如：画质过滤策略"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-group-description">描述（可选）</Label>
            <Textarea
              id="filter-group-description"
              value={group.description}
              onChange={(event) =>
                setGroup((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
              placeholder="例如：拦截低画质资源，保留常用字幕组"
              className="h-24 resize-none rounded-xl px-4 py-2.5"
            />
          </div>

          <div className="rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900">启用策略组</p>
                <p className="text-xs text-zinc-500">停用后，组内规则会保留，但不会参与测试台或后台真实过滤。</p>
              </div>
              <Switch
                checked={group.enabled}
                onCheckedChange={(checked) =>
                  setGroup((current) => ({ ...current, enabled: checked }))
                }
                aria-label="启用策略组"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-600">
              <HiOutlineExclamationCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-zinc-100 bg-zinc-50 p-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button type="button" className="flex-1" onClick={handleSave}>
            保存策略组
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
