import * as React from "react"

import { cn } from "../../lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-paper-300 bg-white/92 px-4 text-sm text-ink-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] transition outline-none placeholder:text-ink-500 focus:border-azure-500 focus:ring-2 focus:ring-azure-500/15 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
)

Input.displayName = "Input"

export { Input }
