import * as React from "react"
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
  HiOutlineXCircle
} from "react-icons/hi2"

import { cn } from "../../lib/shared/cn"

const iconByTone = {
  info: HiOutlineInformationCircle,
  success: HiOutlineCheckCircle,
  warning: HiOutlineExclamationTriangle,
  error: HiOutlineXCircle
} as const

const toneClassNames = {
  info: "border-blue-200 bg-blue-50 text-blue-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-red-200 bg-red-50 text-red-900"
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
        "flex gap-3 rounded-lg border px-4 py-4",
        toneClassNames[tone],
        className
      )}
      {...props}>
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-1">
        <div className="text-sm font-medium">{title}</div>
        {description ? (
          <div className="text-sm leading-6 text-current/85">{description}</div>
        ) : null}
      </div>
    </div>
  )
}

export { Alert }
