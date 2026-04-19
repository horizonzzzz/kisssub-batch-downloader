import { i18n } from "../../lib/i18n"
import type { OptionsApi } from "../../components/options/OptionsPage"
import type { DownloaderConfig } from "../../lib/downloader/config/types"
import type { BatchExecutionConfig } from "../../lib/batch-config/types"
import type { BatchUiPreferences } from "../../lib/batch-preferences/types"
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
  async testConnection(config: DownloaderConfig) {
    const response = await sendRuntimeRequest({
      type: "TEST_DOWNLOADER_CONNECTION",
      settings: config
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
  },
  async getSourceConfig() {
    const response = await sendRuntimeRequest({ type: "GET_SOURCE_CONFIG" })
    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.loadFailed"))
    }

    return response.config
  },
  async saveSourceConfig(config) {
    const response = await sendRuntimeRequest({
      type: "SAVE_SOURCE_CONFIG",
      config
    })

    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.saveFailed"))
    }

    return response.config
  },
  async getDownloaderConfig() {
    const response = await sendRuntimeRequest({ type: "GET_DOWNLOADER_CONFIG" })
    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.loadFailed"))
    }

    return response.config
  },
  async saveDownloaderConfig(config: DownloaderConfig) {
    const response = await sendRuntimeRequest({
      type: "SAVE_DOWNLOADER_CONFIG",
      config
    })

    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.saveFailed"))
    }

    return response.config
  },
  async getBatchExecutionConfig() {
    const response = await sendRuntimeRequest({ type: "GET_BATCH_EXECUTION_CONFIG" })
    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.loadFailed"))
    }

    return response.config
  },
  async saveBatchExecutionConfig(config: Partial<BatchExecutionConfig>) {
    const response = await sendRuntimeRequest({
      type: "SAVE_BATCH_EXECUTION_CONFIG",
      config
    })

    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.saveFailed"))
    }

    return response.config
  },
  async getBatchUiPreferences() {
    const response = await sendRuntimeRequest({ type: "GET_BATCH_UI_PREFERENCES" })
    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.loadFailed"))
    }

    return response.preferences
  },
  async saveBatchUiPreferences(preferences: Partial<BatchUiPreferences>) {
    const response = await sendRuntimeRequest({
      type: "SAVE_BATCH_UI_PREFERENCES",
      preferences
    })

    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.saveFailed"))
    }

    return response.preferences
  }
}
