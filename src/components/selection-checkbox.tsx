import type { SyntheticEvent } from "react"

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
        label="批量"
        title={disabled ? disabledReason : "选择这条帖子进行批量下载"}
        aria-label={disabled ? "该条帖子不可选择" : "选择这条帖子进行批量下载"}
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
