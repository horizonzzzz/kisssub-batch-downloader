import { Button, Card, Typography } from "antd"

import { SOURCE_IDS, SITE_CONFIG_META } from "../lib/source-config"
import styles from "./options-page.module.scss"

const siteCardAccentClassNames: Record<"default" | "emerald" | "cyan", string | undefined> = {
  default: undefined,
  emerald: styles.siteCardDongmanhuayuan,
  cyan: styles.siteCardAcgrip
}

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ")
}

export function OptionsOverviewPage() {
  return (
    <div className={styles.view}>
      <div className={styles.overviewGrid}>
        {SOURCE_IDS.map((sourceId) => {
          const site = SITE_CONFIG_META[sourceId]

          return (
            <Card
              key={site.id}
              variant="borderless"
              className={joinClassNames(
                styles.siteCard,
                siteCardAccentClassNames[site.overviewAccent]
              )}>
              <div className={styles.siteCardStatus}>
                <span className={styles.siteCardDot} aria-hidden="true" />
                <span>支持良好</span>
              </div>
              <Typography.Title level={3}>{site.displayName}</Typography.Title>
              <Typography.Paragraph>{site.summary}</Typography.Paragraph>
              <Button type="default" onClick={() => window.open(`https://${site.url}`, "_blank")}>
                访问站点
              </Button>
            </Card>
          )
        })}
      </div>

      <Card variant="borderless" className={joinClassNames(styles.panel, styles.darkPanel)}>
        <Typography.Title level={3}>当前能力</Typography.Title>
        <ul className={styles.bullets}>
          <li>统一的站点配置页集中管理 4 个受支持站点的启用状态和专属参数。</li>
          <li>禁用站点后不会注入批量下载 UI，后台批处理也会同步拒绝该站点请求。</li>
          <li>源站概览保留为独立页面，方便查看站点简介与快速访问。</li>
        </ul>
      </Card>
    </div>
  )
}
