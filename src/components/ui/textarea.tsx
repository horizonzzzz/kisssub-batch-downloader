import * as React from "react"

import { cn } from "../../lib/shared/cn"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[96px] w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 transition-all outline-none placeholder:text-zinc-400 focus:border-transparent focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
))

Textarea.displayName = "Textarea"

export { Textarea }
