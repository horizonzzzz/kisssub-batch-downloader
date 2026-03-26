import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "../../lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-ink-400/55 shadow-[inset_0_1px_2px_rgba(15,23,42,0.16)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-azure-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white data-[state=checked]:bg-azure-600 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}>
    <SwitchPrimitive.Thumb
      className="pointer-events-none block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-5"
    />
  </SwitchPrimitive.Root>
))

Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }
