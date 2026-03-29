// components/options/pages/history/FailureExplanation.tsx

import type { FailureReason } from "../../../../lib/history/types"

type FailureExplanation = {
  label: string
  desc: string
  suggestion: string
}

export const FAILURE_EXPLANATIONS: Record<FailureReason, FailureExplanation> = {
  parse_error: {
    label: "页面解析失败",
    desc: "可能是源站结构变化，导致无法提取种子链接。",
    suggestion: "建议等待扩展更新适配，或手动下载。"
  },
  timeout: {
    label: "详情页超时",
    desc: "请求源站详情页时响应超时。",
    suggestion: "建议稍后重试，或检查网络连接。"
  },
  qb_error: {
    label: "qB 返回错误",
    desc: "qBittorrent 拒绝了添加请求。",
    suggestion: "检查 WebUI 连接、参数设置或磁盘空间。"
  },
  network_error: {
    label: "网络错误",
    desc: "网络连接失败。",
    suggestion: "检查网络连接后重试。"
  },
  unknown: {
    label: "未知错误",
    desc: "发生了未知的错误。",
    suggestion: "请重试或检查日志。"
  }
}

export function getFailureExplanation(reason: FailureReason): FailureExplanation {
  return FAILURE_EXPLANATIONS[reason] ?? FAILURE_EXPLANATIONS.unknown
}