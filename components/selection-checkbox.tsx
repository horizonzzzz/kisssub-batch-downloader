import type { SyntheticEvent } from "react"

import styles from "./selection-checkbox.module.scss"

type SelectionCheckboxProps = {
  checked: boolean
  onChange: (checked: boolean) => void
}

export function SelectionCheckbox({ checked, onChange }: SelectionCheckboxProps) {
  const stopPropagation = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  return (
    <label
      className={styles.root}
      title="选择这条帖子进行批量下载"
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onPointerDown={stopPropagation}>
      <input
        type="checkbox"
        className={styles.input}
        data-anime-bt-batch-checkbox="1"
        aria-label="选择这条帖子进行批量下载"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
      <span className={styles.dot} aria-hidden="true" />
      <span>批量</span>
    </label>
  )
}
