import { i18n } from "../i18n"

function getKnownSaveValidationMessages(): string[] {
  return [
    i18n.t("options.general.validation.errors.invalidUrl"),
    i18n.t("options.general.validation.errors.permissionDenied"),
    i18n.t("options.general.validation.errors.connectFailed"),
    i18n.t("options.general.validation.errors.authFailed")
  ]
}

export function mapDownloaderValidationErrorToSaveMessage(error: unknown): string {
  const fallbackMessage = i18n.t("options.general.validation.errors.connectFailed")

  if (!(error instanceof Error)) {
    return fallbackMessage
  }

  const message = error.message.trim()
  if (!message) {
    return fallbackMessage
  }

  if (getKnownSaveValidationMessages().includes(message)) {
    return message
  }

  const lowerMessage = message.toLowerCase()

  if (
    message.includes("下载器地址无效") ||
    message.includes("地址格式无效") ||
    lowerMessage.includes("invalid downloader url") ||
    lowerMessage.includes("base url is required")
  ) {
    return i18n.t("options.general.validation.errors.invalidUrl")
  }

  if (
    message.includes("缺少访问") ||
    message.includes("未获得访问") ||
    lowerMessage.includes("missing permission") ||
    lowerMessage.includes("not granted permission") ||
    lowerMessage.includes("permission to access")
  ) {
    return i18n.t("options.general.validation.errors.permissionDenied")
  }

  if (
    message.includes("身份验证失败") ||
    message.includes("登录失败") ||
    message.includes("凭据") ||
    lowerMessage.includes("http 401") ||
    lowerMessage.includes("authentication failed") ||
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("login failed") ||
    lowerMessage.includes("credentials")
  ) {
    return i18n.t("options.general.validation.errors.authFailed")
  }

  if (
    message.includes("无法连接") ||
    message.includes("连接失败") ||
    message.includes("超时") ||
    lowerMessage.includes("connection failed") ||
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("network") ||
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("refused") ||
    lowerMessage.includes("econnrefused") ||
    lowerMessage.includes("request failed")
  ) {
    return fallbackMessage
  }

  return message
}
