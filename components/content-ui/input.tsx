import * as React from "react"

import { cn } from "../../lib/shared/cn"

export type ContentInputProps = React.InputHTMLAttributes<HTMLInputElement>

const ContentInput = React.forwardRef<HTMLInputElement, ContentInputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "min-h-[var(--anime-bt-control-height)] min-w-0 w-full rounded-[var(--anime-bt-radius-control)] border border-[rgba(188,200,214,0.92)] bg-[#fbfdff] px-[12px] text-[13px] leading-[1.45] text-[#182636] outline-none transition-[border-color,box-shadow,background-color,color,opacity] duration-150 ease-out placeholder:text-[#8a98a8] focus-visible:border-[rgba(20,100,217,0.56)] focus-visible:ring-[3px] focus-visible:ring-blue-500/20 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:bg-[#f1f4f8] disabled:opacity-70",
          className
        )}
        {...props}
      />
    )
  }
)

ContentInput.displayName = "ContentInput"

export { ContentInput }
