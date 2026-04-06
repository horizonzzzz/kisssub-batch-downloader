import type { OptionsApi } from "../../components/options/OptionsPage"
import { sendRuntimeRequest } from "../../lib/shared/messages"

export const optionsApi: OptionsApi = {
  async loadSettings() {
    const response = await sendRuntimeRequest({ type: "GET_SETTINGS" })
    if (!response.ok) {
      throw new Error(response.error || "无法读取设置。")
    }

    return response.settings
  },
  async saveSettings(settings) {
    const response = await sendRuntimeRequest({
      type: "SAVE_SETTINGS",
      settings
    })

    if (!response.ok) {
      throw new Error(response.error || "保存失败。")
    }

    return response.settings
  },
  async testConnection(settings) {
    const response = await sendRuntimeRequest({
      type: "TEST_DOWNLOADER_CONNECTION",
      settings
    })

    if (!response.ok) {
      throw new Error(response.error || "连接测试失败。")
    }

    return response.result
  }
}
