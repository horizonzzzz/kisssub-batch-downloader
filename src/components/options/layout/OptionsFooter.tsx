import { HiOutlineArrowPath } from "react-icons/hi2"

import { Button } from "../../ui"

export function OptionsFooter({
  footerLabel,
  saving
}: {
  footerLabel: string
  saving: boolean
}) {
  return (
    <footer className="sticky bottom-0 z-10 flex flex-col gap-4 border-t border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur-md md:flex-row md:items-center md:justify-between md:px-8">
      <div className="text-sm text-zinc-500">{footerLabel}</div>
      <Button type="submit" size="lg" className="min-w-[120px]" disabled={saving}>
        {saving ? <HiOutlineArrowPath className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        <span>保存所有设置</span>
      </Button>
    </footer>
  )
}
