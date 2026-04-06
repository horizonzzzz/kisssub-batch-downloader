type BatchSelectionSummaryProps = {
  selectedCount: number
  statusText: string
}

export function BatchSelectionSummary({
  selectedCount,
  statusText
}: BatchSelectionSummaryProps) {
  return (
    <section
      data-anime-bt-role="count-card"
      className="flex min-h-[152px] flex-col items-center justify-center rounded-[var(--anime-bt-radius-lg)] border border-[rgba(214,223,234,0.92)] bg-[linear-gradient(180deg,rgba(246,249,253,0.96),rgba(239,244,250,0.96)),linear-gradient(135deg,rgba(42,143,255,0.08),rgba(17,26,36,0))] px-[20px] py-[18px] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_12px_28px_rgba(15,23,42,0.06)]"
      aria-live="polite">
      <span className="block text-[52px] font-light leading-none text-[#142131]">{selectedCount}</span>
      <span className="mt-[6px] block text-[11px] font-bold uppercase tracking-[0.18em] text-[#687586]">
        已选资源
      </span>
      <p className="mt-[12px] text-[12px] leading-[1.55] text-[#4d5d70]">{statusText}</p>
    </section>
  )
}
