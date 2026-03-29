import * as React from "react"

import { Alert } from "../../ui"
import type { OptionsRouteMeta } from "../config/routes"
import type { StatusTone } from "../hooks/use-settings-form"
import { OptionsFooter } from "./OptionsFooter"
import { OptionsHeader } from "./OptionsHeader"

function mapTone(tone: StatusTone) {
  if (tone === "success") {
    return "success"
  }

  if (tone === "error") {
    return "error"
  }

  return "info"
}

type OptionsShellProps = {
  activeMeta: OptionsRouteMeta
  status: { tone: StatusTone; message: string }
  saving: boolean
  onSubmit: React.FormEventHandler<HTMLFormElement>
  children: React.ReactNode
}

export function OptionsShell({
  activeMeta,
  status,
  saving,
  onSubmit,
  children
}: OptionsShellProps) {
  return (
    <form
      className="relative flex min-w-0 flex-1 flex-col lg:min-h-screen lg:self-stretch"
      onSubmit={onSubmit}>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8 pb-28 md:px-8 md:py-10">
          <OptionsHeader activeMeta={activeMeta} />

          <div role="status" aria-live="polite">
            <Alert tone={mapTone(status.tone)} title={status.message} />
          </div>

          {children}
        </div>
      </div>

      <OptionsFooter footerLabel={activeMeta.footerLabel} saving={saving} />
    </form>
  )
}
