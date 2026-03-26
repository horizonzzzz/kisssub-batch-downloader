import { LoaderCircle } from "lucide-react"

import { Button } from "../../ui"

export function OptionsFooter({
  footerLabel,
  saving
}: {
  footerLabel: string
  saving: boolean
}) {
  return (
    <footer className="sticky bottom-0 z-10 flex flex-col gap-4 border-t border-paper-300/80 bg-white/82 px-5 py-4 backdrop-blur-xl md:px-8 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
          当前视图
        </span>
        <strong className="font-display text-[1.1rem] tracking-[-0.03em] text-ink-950">
          {footerLabel}
        </strong>
      </div>
      <Button type="submit" size="lg" className="min-w-40" disabled={saving}>
        {saving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        <span>保存所有设置</span>
      </Button>
    </footer>
  )
}
