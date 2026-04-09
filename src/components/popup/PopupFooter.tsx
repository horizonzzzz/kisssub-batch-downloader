import { i18n } from "../../lib/i18n"

type PopupFooterProps = {
  version: string
  helpUrl: string
}

export function PopupFooter({ version, helpUrl }: PopupFooterProps) {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-100/50 px-4 py-3 text-center">
      <p className="text-[11px] font-medium text-zinc-400">
        Anime BT Batch v{version} ·{" "}
        <a
          href={helpUrl}
          rel="noreferrer"
          target="_blank"
          className="hover:text-zinc-600 hover:underline transition-colors"
        >
          {i18n.t("popup.footer.help")}
        </a>
      </p>
    </footer>
  )
}


