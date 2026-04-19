import { i18n } from "../../lib/i18n"
import type { OptionsApi } from "../../components/options/OptionsPage"
import { sendRuntimeRequest } from "../../lib/shared/messages"

export const optionsApi: OptionsApi = {
  async loadAppSettings() {
    const response = await sendRuntimeRequest({ type: "GET_APP_SETTINGS" })
    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.loadFailed"))
    }

    return response.settings
  },
  async saveAppSettings(settings) {
    const response = await sendRuntimeRequest({
      type: "SAVE_APP_SETTINGS",
      settings
    })

    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.saveFailed"))
    }

    return response.settings
  },
  async upsertSubscription(subscription) {
    const response = await sendRuntimeRequest({
      type: "UPSERT_SUBSCRIPTION",
      subscription
    })

    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.saveFailed"))
    }
  },
  async deleteSubscription(subscriptionId) {
    const response = await sendRuntimeRequest({
      type: "DELETE_SUBSCRIPTION",
      subscriptionId
    })

    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.saveFailed"))
    }
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
  },
  async getFilterConfig() {
    const response = await sendRuntimeRequest({ type: "GET_FILTER_CONFIG" })
    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.loadFailed"))
    }

    return response.config
  },
  async saveFilterConfig(config) {
    const response = await sendRuntimeRequest({
      type: "SAVE_FILTER_CONFIG",
      config
    })

    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.saveFailed"))
    }

    return response.config
  }
}
