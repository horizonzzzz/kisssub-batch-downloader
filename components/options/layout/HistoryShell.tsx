import type { OptionsRouteMeta } from "../config/routes"

type HistoryShellProps = {
  children: React.ReactNode
}

export function HistoryShell({ children }: HistoryShellProps) {
  return (
    <section className="relative flex min-w-0 flex-1 flex-col lg:min-h-screen lg:self-stretch">
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8 md:px-8 md:py-10">
          {children}
        </div>
      </div>
    </section>
  )
}