import type { SyntheticEvent } from "react"

import { i18n } from "../lib/i18n"
import { ContentCheckbox } from "./content-ui/checkbox"

type SelectionCheckboxProps = {
  checked: boolean
  disabled?: boolean
  disabledReason?: string
  onChange: (checked: boolean) => void
}

export function SelectionCheckbox({ checked, disabled = false, disabledReason, onChange }: SelectionCheckboxProps) {
  const stopPropagation = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  return (
    <div className="anime-bt-content-root">
      <ContentCheckbox
        checked={checked}
        disabled={disabled}
        label={i18n.t("content.checkbox.label")}
        title={disabled ? disabledReason : i18n.t("content.checkbox.selectTitle")}
        aria-label={
          disabled ? i18n.t("content.checkbox.disabledAriaLabel") : i18n.t("content.checkbox.selectTitle")
        }
        data-anime-bt-batch-checkbox="1"
        onCheckedChange={onChange}
        containerClassName="mr-[8px]"
        containerProps={{
          onClick: stopPropagation,
          onMouseDown: stopPropagation,
          onPointerDown: stopPropagation
        }}
      />
    </div>
  )
}
