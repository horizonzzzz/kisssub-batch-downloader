import { Badge } from "../../ui"
import type { OptionsRouteMeta } from "../config/routes"

const BRAND_NAME = "Anime BT Batch"

export function OptionsHeader({ activeMeta }: { activeMeta: OptionsRouteMeta }) {
  return (
    <header className="space-y-4">
      <Badge variant="brand">{BRAND_NAME}</Badge>
      <div className="space-y-3">
        <h1 className="font-display text-[clamp(2rem,4vw,3.35rem)] leading-none tracking-[-0.06em] text-ink-950">
          {activeMeta.title}
        </h1>
        <p className="max-w-3xl text-[15px] leading-7 text-ink-600">
          {activeMeta.description}
        </p>
      </div>
    </header>
  )
}
