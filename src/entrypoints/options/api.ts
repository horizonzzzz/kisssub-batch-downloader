import { i18n } from "../../lib/i18n"
import type { OptionsApi } from "../../components/options/OptionsPage"
import { sendRuntimeRequest } from "../../lib/shared/messages"

export const optionsApi: OptionsApi = {
  async loadSettings() {
    const response = await sendRuntimeRequest({ type: "GET_SETTINGS" })
    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.loadFailed"))
    }

    return response.settings
  },
  async saveSettings(settings) {
    const response = await sendRuntimeRequest({
      type: "SAVE_SETTINGS",
      settings
    })

    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.saveFailed"))
    }

    return response.settings
  },
  async testConnection(settings) {
    const response = await sendRuntimeRequest({
      type: "TEST_DOWNLOADER_CONNECTION",
      settings
    })

    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.connectionTestFailed"))
    }

    return response.result
  }
}
