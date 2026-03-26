import * as React from "react"
import { AlertCircle, AlertTriangle, CheckCircle2, CircleX } from "lucide-react"

import { cn } from "../../lib/utils"

const iconByTone = {
  info: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: CircleX
} as const

const toneClassNames = {
  info: "border-azure-500/15 bg-azure-500/8 text-ink-800",
  success: "border-mint-500/18 bg-mint-500/10 text-ink-800",
  warning: "border-amber-500/22 bg-amber-500/10 text-ink-800",
  error: "border-crimson-500/16 bg-crimson-500/8 text-ink-800"
} as const

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  tone?: keyof typeof iconByTone
  title: React.ReactNode
  description?: React.ReactNode
}

function Alert({
  className,
  tone = "info",
  title,
  description,
  ...props
}: AlertProps) {
  const Icon = iconByTone[tone]

  return (
    <div
      className={cn(
          "flex gap-3 rounded-[1.5rem] border px-4 py-4 shadow-panel",
        toneClassNames[tone],
        className
      )}
      {...props}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <div className="text-sm font-semibold">{title}</div>
        {description ? (
          <div className="text-sm leading-6 text-ink-700">{description}</div>
        ) : null}
      </div>
    </div>
  )
}

export { Alert }
