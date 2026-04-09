import { i18n } from "../../../../lib/i18n"
import type { JSX } from "react"

import { Alert } from "../../../ui"

export function ConnectionHelpAlert(): JSX.Element {
  return (
    <Alert
      tone="info"
      title={i18n.t("options.general.connectionHelp.title")}
      description={
        <div className="grid gap-3">
          <p className="m-0">
            {i18n.t("options.general.connectionHelp.body1.prefix")}{" "}
            <code>Tools/Options -&gt; WebUI</code>{" "}
            {i18n.t("options.general.connectionHelp.body1.middle")}{" "}
            <code>Enable Cross-Site Request Forgery (CSRF) protection</code>
            {i18n.t("options.general.connectionHelp.body1.suffix")}
          </p>
          <p className="m-0">
            {i18n.t("options.general.connectionHelp.body2.prefix")} <code>Host header validation</code>。
            {i18n.t("options.general.connectionHelp.body2.suffix")}
          </p>
        </div>
      }
    />
  )
}


