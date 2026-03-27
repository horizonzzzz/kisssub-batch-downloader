import type { SyntheticEvent } from "react"

import { cn } from "../lib/utils"

type SelectionCheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function SelectionCheckbox({ checked, onChange }: SelectionCheckboxProps) {
  const stopPropagation = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  return (
    <div className="anime-bt-content-root">
      <label
        className={cn("anime-bt-selection-checkbox", checked && "is-checked")}
        title="选择这条帖子进行批量下载"
        onClick={stopPropagation}
        onMouseDown={stopPropagation}
        onPointerDown={stopPropagation}>
        <input
          type="checkbox"
          className="anime-bt-selection-checkbox__input"
          data-anime-bt-batch-checkbox="1"
          aria-label="选择这条帖子进行批量下载"
          checked={checked}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span className="anime-bt-selection-checkbox__dot" aria-hidden="true" />
        <span>批量</span>
      </label>
    </div>
  )
}
