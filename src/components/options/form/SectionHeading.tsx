import type { JSX } from "react"

type SectionHeadingProps = {
  title: string
  description?: string
}

export function SectionHeading({
  title,
  description
}: SectionHeadingProps): JSX.Element {
  return (
    <div className="grid gap-1">
      <h3 className="text-base font-medium text-zinc-900">{title}</h3>
      {description ? (
        <p className="text-sm leading-6 text-zinc-500">{description}</p>
      ) : null}
    </div>
  )
}
