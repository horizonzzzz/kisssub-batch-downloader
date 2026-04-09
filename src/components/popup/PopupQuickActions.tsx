import { i18n } from "../../lib/i18n"
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
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {i18n.t("popup.quickActions.title")}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          disabled={disabled}
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onOpenOptionsRoute("/history")}>
          <HiOutlineClock aria-hidden="true" className="h-4 w-4" />
          <span>{i18n.t("popup.quickActions.history")}</span>
        </Button>
        <Button
          disabled={disabled}
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onOpenOptionsRoute("/filters")}>
          <HiOutlineFunnel aria-hidden="true" className="h-4 w-4" />
          <span>{i18n.t("popup.quickActions.filters")}</span>
        </Button>
      </div>
    </Card>
  )
}


