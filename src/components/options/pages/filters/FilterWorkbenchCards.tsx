import { i18n } from "../../../../lib/i18n"
import { HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2"

import { Badge, Button, Card, Switch } from "../../../ui"
import {
  summarizeConditionList,
  type FilterWorkbenchFilter
} from "./filter-workbench"

type FilterWorkbenchCardProps = {
  filter: FilterWorkbenchFilter
  onEdit: () => void
  onDelete: () => void
  onToggleEnabled: (enabled: boolean) => void
}

export function FilterWorkbenchCard({
  filter,
  onEdit,
  onDelete,
  onToggleEnabled
}: FilterWorkbenchCardProps) {
  return (
    <Card>
      <div className={["space-y-4 px-6 py-5", filter.enabled ? "" : "opacity-60"].join(" ")}>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-zinc-900">
                {filter.name}
              </h3>
              <Badge variant={filter.enabled ? "success" : "muted"}>
                {filter.enabled ? i18n.t("options.filters.badge.enabled") : i18n.t("options.filters.badge.disabled")}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-zinc-500">
              {i18n.t("options.filters.cardDescription")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onEdit}>
              <HiOutlinePencilSquare className="h-4 w-4" />
              {i18n.t("options.filters.edit")}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
              <HiOutlineTrash className="h-4 w-4" />
              {i18n.t("common.delete")}
            </Button>
            <Switch
              aria-label={`${filter.name} ${i18n.t("options.filters.enableSwitchSuffix")}`}
              checked={filter.enabled}
              onCheckedChange={onToggleEnabled}
            />
          </div>
        </div>

        <div className="grid gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {i18n.t("options.filters.mustTitle")}
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              {summarizeConditionList(filter.must)}
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {i18n.t("options.filters.anyTitle")}
            </div>
            <p className="mt-2 text-sm leading-6 text-zinc-700">
              {summarizeConditionList(filter.any)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
