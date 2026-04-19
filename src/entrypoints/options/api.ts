import { i18n } from "../../lib/i18n"
import type { DownloaderConfig } from "../../lib/downloader/config/types"
import type { BatchExecutionConfig } from "../../lib/batch-config/types"
import type { BatchUiPreferences } from "../../lib/batch-preferences/types"
import type { SubscriptionPolicyConfig } from "../../lib/subscriptions/policy/types"
import type { TestDownloaderConnectionResult } from "../../lib/shared/types"
import type { SubscriptionEntry } from "../../lib/shared/types"
import type { FilterConfig } from "../../lib/filter-rules/types"
import type { SourceConfig } from "../../lib/sources/config/types"
import { sendRuntimeRequest } from "../../lib/shared/messages"

export type OptionsApi = {
  getFilterConfig: () => Promise<FilterConfig>
  saveFilterConfig: (config: FilterConfig) => Promise<FilterConfig>
  getSourceConfig: () => Promise<SourceConfig>
  saveSourceConfig: (config: SourceConfig) => Promise<SourceConfig>
  getDownloaderConfig: () => Promise<DownloaderConfig>
  saveDownloaderConfig: (config: DownloaderConfig) => Promise<DownloaderConfig>
  testConnection: (config: DownloaderConfig) => Promise<TestDownloaderConnectionResult>
  getBatchExecutionConfig: () => Promise<BatchExecutionConfig>
  saveBatchExecutionConfig: (config: BatchExecutionConfig) => Promise<BatchExecutionConfig>
  saveGeneralSettings: (payload: {
    downloaderConfig: DownloaderConfig
    batchExecutionConfig: BatchExecutionConfig
  }) => Promise<{
    downloaderConfig: DownloaderConfig
    batchExecutionConfig: BatchExecutionConfig
  }>
  getBatchUiPreferences: () => Promise<BatchUiPreferences>
  saveBatchUiPreferences: (preferences: Partial<BatchUiPreferences>) => Promise<BatchUiPreferences>
  getSubscriptionPolicy: () => Promise<SubscriptionPolicyConfig>
  saveSubscriptionPolicy: (config: SubscriptionPolicyConfig) => Promise<SubscriptionPolicyConfig>
  upsertSubscription: (subscription: SubscriptionEntry) => Promise<void>
  deleteSubscription: (subscriptionId: string) => Promise<void>
}

export const optionsApi: OptionsApi = {
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
  async getSubscriptionPolicy() {
    const response = await sendRuntimeRequest({ type: "GET_SUBSCRIPTION_POLICY" })
    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.loadFailed"))
    }

    return response.config
  },
  async saveSubscriptionPolicy(config: SubscriptionPolicyConfig) {
    const response = await sendRuntimeRequest({
      type: "SAVE_SUBSCRIPTION_POLICY",
      config
    })

    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.saveFailed"))
    }

    return response.config
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
  async saveBatchExecutionConfig(config: BatchExecutionConfig) {
    const response = await sendRuntimeRequest({
      type: "SAVE_BATCH_EXECUTION_CONFIG",
      config
    })

    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.status.saveFailed"))
    }

    return response.config
  },
  async saveGeneralSettings(payload) {
    const response = await sendRuntimeRequest({
      type: "SAVE_GENERAL_SETTINGS",
      downloaderConfig: payload.downloaderConfig,
      batchExecutionConfig: payload.batchExecutionConfig
    })

    if (!response.ok) {
      throw new Error(response.error || i18n.t("options.general.saveCombinedFailed"))
    }

    return {
      downloaderConfig: response.downloaderConfig,
      batchExecutionConfig: response.batchExecutionConfig
    }
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
