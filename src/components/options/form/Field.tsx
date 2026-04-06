import type { JSX, ReactNode } from "react"

import { Label } from "../../ui"

type FormFieldProps = {
  label: string
  htmlFor: string
  required?: boolean
  error?: string
  children: ReactNode
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  children
}: FormFieldProps): JSX.Element {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="inline-flex items-center gap-1.5">
        <span>{label}</span>
        {required ? <span className="text-crimson-500">*</span> : null}
      </Label>
      {children}
      {error ? <p className="text-sm text-crimson-600">{error}</p> : null}
    </div>
  )
}
