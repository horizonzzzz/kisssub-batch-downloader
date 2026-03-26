import { ExternalLink } from "lucide-react"

import { SITE_CONFIG_META, SOURCE_IDS } from "../../../../lib/source-config"
import { Button, Card } from "../../../ui"

const accentClassNames: Record<"default" | "emerald" | "cyan", string> = {
  default: "from-azure-400 to-azure-600",
  emerald: "from-mint-500 to-mint-600",
  cyan: "from-cyan-400 to-cyan-600"
}

export function OverviewPage() {
  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-3">
        {SOURCE_IDS.map((sourceId) => {
          const site = SITE_CONFIG_META[sourceId]

          return (
            <Card key={site.id} className="relative overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${accentClassNames[site.overviewAccent]}`}
                aria-hidden="true"
              />
              <div className="grid gap-4 px-6 py-6">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-mint-500 shadow-[0_0_0_6px_rgba(16,185,129,0.14)]" />
                  <span>支持良好</span>
                </div>
                <div className="space-y-2">
                  <h2 className="font-display text-[1.35rem] tracking-[-0.04em] text-ink-950">
                    {site.displayName}
                  </h2>
                  <p className="text-sm leading-6 text-ink-600">{site.summary}</p>
                </div>
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => window.open(`https://${site.url}`, "_blank")}>
                    <span>访问站点</span>
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="bg-[linear-gradient(145deg,rgba(22,30,54,1),rgba(14,20,35,1))] text-white">
        <div className="grid gap-4 px-6 py-6">
          <div className="space-y-2">
            <h2 className="font-display text-[1.4rem] tracking-[-0.04em] text-white">
              当前能力
            </h2>
          </div>
          <ul className="grid gap-3 pl-5 text-sm leading-6 text-white/76">
            <li>统一的站点配置页集中管理 4 个受支持站点的启用状态和专属参数。</li>
            <li>禁用站点后不会注入批量下载 UI，后台批处理也会同步拒绝该站点请求。</li>
            <li>源站概览保留为独立页面，方便查看站点简介与快速访问。</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
