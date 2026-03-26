import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]",
  {
    variants: {
      variant: {
        brand: "border-azure-500/20 bg-azure-500/10 text-azure-700",
        success: "border-mint-500/20 bg-mint-500/12 text-mint-600",
        muted: "border-paper-300 bg-paper-100 text-ink-600",
        warning: "border-amber-500/25 bg-amber-500/10 text-amber-600"
      }
    },
    defaultVariants: {
      variant: "brand"
    }
  }
)

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
