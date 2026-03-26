import "./styles/options.css"

import { OptionsPage, type OptionsApi } from "./components/options-page"
import { DEFAULT_SETTINGS } from "./lib/settings"
import type { Settings } from "./lib/types"

const api: OptionsApi = {
  async loadSettings() {
    const response = await chrome.runtime.sendMessage({ type: "GET_SETTINGS" })
    if (!response?.ok) {
      throw new Error(response?.error ?? "无法读取设置。")
    }

    return response.settings as Settings
  },
  async saveSettings(settings) {
    const response = await chrome.runtime.sendMessage({
      type: "SAVE_SETTINGS",
      settings
    })

    if (!response?.ok) {
      throw new Error(response?.error ?? "保存失败。")
    }

    return (response.settings as Settings) ?? DEFAULT_SETTINGS
  },
  async testConnection(settings) {
    const response = await chrome.runtime.sendMessage({
      type: "TEST_QB_CONNECTION",
      settings
    })

    if (!response?.ok) {
      throw new Error(response?.error ?? "连接测试失败。")
    }

    return response.result
  }
}

function Options() {
  return <OptionsPage api={api} />
}

export default Options
