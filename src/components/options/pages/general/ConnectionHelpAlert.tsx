import type { JSX } from "react"

import { Alert } from "../../../ui"

export function ConnectionHelpAlert(): JSX.Element {
  return (
    <Alert
      tone="info"
      title="下载器兼容性提示"
      description={
        <div className="grid gap-3">
          <p className="m-0">
            当前仅支持通过浏览器扩展上下文访问本机下载器 WebUI。若 qBittorrent 连接测试返回 401，而账号密码确认无误，请先在 qBittorrent 的{" "}
            <code>Tools/Options -&gt; WebUI</code> 中关闭{" "}
            <code>Enable Cross-Site Request Forgery (CSRF) protection</code>。
          </p>
          <p className="m-0">
            如果关闭后仍失败，再关闭 <code>Host header validation</code>。仅建议在
            WebUI 只供本机使用时这样配置，不建议暴露到局域网或公网。
          </p>
        </div>
      }
    />
  )
}
