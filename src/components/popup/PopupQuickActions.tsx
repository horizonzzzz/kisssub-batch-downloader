import { HiOutlineClock, HiOutlineFunnel } from "react-icons/hi2"

import type { PopupOptionsRoute } from "../../lib/shared/popup"
import { Button, Card } from "../ui"

type PopupQuickActionsProps = {
  onOpenOptionsRoute: (route: PopupOptionsRoute) => void
  disabled?: boolean
}

export function PopupQuickActions({ onOpenOptionsRoute, disabled = false }: PopupQuickActionsProps) {
  return (
    <Card className="grid gap-2 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">快捷操作</p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={disabled}
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onOpenOptionsRoute("/history")}>
          <HiOutlineClock aria-hidden="true" className="h-4 w-4" />
          <span>批次历史</span>
        </Button>
        <Button
          disabled={disabled}
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onOpenOptionsRoute("/filters")}>
          <HiOutlineFunnel aria-hidden="true" className="h-4 w-4" />
          <span>过滤规则</span>
        </Button>
      </div>
    </Card>
  )
}
