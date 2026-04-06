import type { OptionsRouteMeta } from "../config/routes"

export function OptionsHeader({ activeMeta }: { activeMeta: OptionsRouteMeta }) {
  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        {activeMeta.title}
      </h1>
      <p className="mt-1 text-sm leading-6 text-zinc-500">{activeMeta.description}</p>
    </header>
  )
}
