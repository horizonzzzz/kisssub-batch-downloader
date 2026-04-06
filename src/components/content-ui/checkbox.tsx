import * as React from "react"

import { cn } from "../../lib/shared/cn"

export interface ContentCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "checked" | "onChange" | "size"> {
  checked: boolean
  label: React.ReactNode
  onCheckedChange?: (checked: boolean) => void
  title?: string
  containerClassName?: string
  dotClassName?: string
  containerProps?: React.LabelHTMLAttributes<HTMLLabelElement>
}

const ContentCheckbox = React.forwardRef<HTMLInputElement, ContentCheckboxProps>(
  (
    {
      checked,
      label,
      onCheckedChange,
      title,
      className,
      containerClassName,
      dotClassName,
      containerProps,
      ...props
    },
    ref
  ) => {
    return (
      <label
        data-anime-bt-role="selection-pill"
        data-state={checked ? "checked" : "unchecked"}
        data-disabled={props.disabled ? "true" : "false"}
        title={title}
        className={cn(
          "inline-flex min-h-[var(--anime-bt-checkbox-pill-height)] items-center whitespace-nowrap align-middle gap-[5px] rounded-[var(--anime-bt-radius-pill)] border border-[rgba(72,94,117,0.22)] bg-[rgba(255,255,255,0.94)] px-[8px] text-[12px] leading-none text-[#294457] shadow-[0_6px_16px_rgba(15,23,42,0.08)] backdrop-blur-[8px]",
          props.disabled && "cursor-not-allowed opacity-50",
          containerClassName
        )}
        {...containerProps}>
        <input
          ref={ref}
          type="checkbox"
          data-anime-bt-role="selection-input"
          checked={checked}
          className={cn("m-0 h-[13px] w-[13px] shrink-0 accent-[var(--anime-bt-blue-600)]", className)}
          onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
          {...props}
        />
        <span
          data-anime-bt-role="selection-dot"
          aria-hidden="true"
          className={cn(
            "h-[6px] w-[6px] rounded-full bg-[linear-gradient(180deg,#d87938,#bb5b23)] shadow-[0_0_0_3px_rgba(216,111,46,0.14)]",
            dotClassName
          )}
        />
        <span>{label}</span>
      </label>
    )
  }
)

ContentCheckbox.displayName = "ContentCheckbox"

export { ContentCheckbox }
