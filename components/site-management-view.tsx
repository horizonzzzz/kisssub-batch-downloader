import { useEffect, useMemo, useRef, useState } from "react"

import { Form, Input, Radio, Switch, Typography } from "antd"
import type { FormInstance } from "antd"
import { HiChevronDown, HiChevronUp } from "react-icons/hi2"

import acgripSiteIcon from "../assets/site-icon-acgrip.png"
import bangumiMoeSiteIcon from "../assets/site-icon-bangumimoe.svg"
import dongmanhuayuanSiteIcon from "../assets/site-icon-dongmanhuayuan.png"
import kisssubSiteIcon from "../assets/site-icon-kisssub.png"
import {
  getDeliveryModeLabel,
  getSupportedDeliveryModes,
  resolveSourceDeliveryMode
} from "../lib/delivery"
import {
  SITE_CONFIG_META,
  SOURCE_IDS,
  type SiteConfigMeta
} from "../lib/source-config"
import { normalizeEnabledSources, resolveSourceEnabled } from "../lib/source-enablement"
import type { Settings, SourceId } from "../lib/types"
import styles from "./site-management-view.module.scss"

const SITE_ICONS: Record<SourceId, string> = {
  kisssub: kisssubSiteIcon,
  dongmanhuayuan: dongmanhuayuanSiteIcon,
  acgrip: acgripSiteIcon,
  bangumimoe: bangumiMoeSiteIcon
}

type SiteManagementViewProps = {
  form: FormInstance<Settings>
}

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ")
}

function buildSortedSites(enabledSources: Settings["enabledSources"]): SiteConfigMeta[] {
  return SOURCE_IDS.map((sourceId) => SITE_CONFIG_META[sourceId]).sort((left, right) => {
    const leftEnabled = resolveSourceEnabled(left.id, { enabledSources })
    const rightEnabled = resolveSourceEnabled(right.id, { enabledSources })

    if (leftEnabled === rightEnabled) {
      return SOURCE_IDS.indexOf(left.id) - SOURCE_IDS.indexOf(right.id)
    }

    return leftEnabled ? -1 : 1
  })
}

function renderStrategyOptions(sourceId: SourceId) {
  return getSupportedDeliveryModes(sourceId).map((mode) => (
    <Radio key={mode} value={mode}>
      {getDeliveryModeLabel(mode)}
    </Radio>
  ))
}

export function SiteManagementView({ form }: SiteManagementViewProps) {
  const watchedValues = Form.useWatch([], form) ?? {}
  const currentValues = form.getFieldsValue(true) as Partial<Settings>
  const enabledSources = currentValues.enabledSources ?? watchedValues.enabledSources ?? {}
  const sourceDeliveryModes =
    currentValues.sourceDeliveryModes ?? watchedValues.sourceDeliveryModes ?? {}
  const [expandedSites, setExpandedSites] = useState<SourceId[]>([])
  const hasSyncedExpandedSites = useRef(false)
  const previousEnabledSourcesRef = useRef<Settings["enabledSources"] | null>(null)

  useEffect(() => {
    const currentEnabledSources = normalizeEnabledSources(enabledSources)

    if (!hasSyncedExpandedSites.current) {
      setExpandedSites(SOURCE_IDS.filter((sourceId) => currentEnabledSources[sourceId]))
      hasSyncedExpandedSites.current = true
      previousEnabledSourcesRef.current = currentEnabledSources
      return
    }

    const previousEnabledSources =
      previousEnabledSourcesRef.current ?? currentEnabledSources

    const newlyEnabled = SOURCE_IDS.filter(
      (sourceId) =>
        !previousEnabledSources[sourceId] && currentEnabledSources[sourceId]
    )
    const newlyDisabled = SOURCE_IDS.filter(
      (sourceId) =>
        previousEnabledSources[sourceId] && !currentEnabledSources[sourceId]
    )

    if (newlyEnabled.length || newlyDisabled.length) {
      setExpandedSites((currentExpandedSites) => {
        const nextExpandedSites = currentExpandedSites.filter(
          (sourceId) => !newlyDisabled.includes(sourceId)
        )

        for (const sourceId of newlyEnabled) {
          if (!nextExpandedSites.includes(sourceId)) {
            nextExpandedSites.push(sourceId)
          }
        }

        return nextExpandedSites
      })
    }

    previousEnabledSourcesRef.current = currentEnabledSources
  }, [enabledSources])

  const sortedSites = useMemo(
    () => buildSortedSites(enabledSources),
    [enabledSources]
  )

  const enabledCount = useMemo(
    () =>
      SOURCE_IDS.filter((sourceId) =>
        resolveSourceEnabled(sourceId, { enabledSources })
      ).length,
    [enabledSources]
  )

  const toggleSiteExpanded = (sourceId: SourceId) => {
    if (!resolveSourceEnabled(sourceId, { enabledSources })) {
      return
    }

    setExpandedSites((currentExpandedSites) =>
      currentExpandedSites.includes(sourceId)
        ? currentExpandedSites.filter((currentId) => currentId !== sourceId)
        : [...currentExpandedSites, sourceId]
    )
  }

  const renderStrategySection = (site: SiteConfigMeta) => {
    if (site.strategyMode === "locked") {
      return (
        <section className={styles.section}>
          <div className={styles.sectionHeading}>
            <Typography.Title level={4}>下载策略</Typography.Title>
            <Typography.Paragraph>
              该站点当前使用固定下载方式，不提供额外切换项。
            </Typography.Paragraph>
          </div>
          <div className={styles.lockedStrategy}>
            <span className={styles.lockedStrategyLabel}>
              {site.lockedStrategyLabel}
            </span>
          </div>
        </section>
      )
    }

    const currentMode = resolveSourceDeliveryMode(site.id, { sourceDeliveryModes })

    return (
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <Typography.Title level={4}>下载策略</Typography.Title>
          <Typography.Paragraph>
            当前策略：{getDeliveryModeLabel(currentMode)}
          </Typography.Paragraph>
        </div>
        <Form.Item
          className={styles.formItem}
          label="下载策略"
          name={["sourceDeliveryModes", site.id]}>
          <Radio.Group className={styles.radioGroup}>
            {renderStrategyOptions(site.id)}
          </Radio.Group>
        </Form.Item>
      </section>
    )
  }

  const renderKisssubFields = () => {
    return (
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <Typography.Title level={4}>脚本参数</Typography.Title>
          <Typography.Paragraph>
            保留历史脚本配置，重新启用后会继续沿用当前参数。
          </Typography.Paragraph>
        </div>
        <div className={styles.fieldGrid}>
          <Form.Item
            className={styles.formItem}
            label="Kisssub 外部脚本地址"
            name="remoteScriptUrl">
            <Input />
          </Form.Item>
          <Form.Item
            className={styles.formItem}
            label="Kisssub 脚本版本号"
            name="remoteScriptRevision">
            <Input />
          </Form.Item>
        </div>
      </section>
    )
  }

  const renderSiteNote = (site: SiteConfigMeta) => {
    if (!site.noteDescription) {
      return null
    }

    return (
      <div
        className={joinClassNames(
          styles.note,
          site.noteTone === "warning" && styles.noteWarning,
          site.noteTone === "neutral" && styles.noteNeutral
        )}>
        {site.noteTitle ? (
          <div className={styles.noteTitle}>{site.noteTitle}</div>
        ) : null}
        <div className={styles.noteDescription}>{site.noteDescription}</div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <section className={styles.summaryBar}>
        <div>
          <div className={styles.summaryEyebrow}>站点启用状态</div>
          <div className={styles.summaryCount}>
            <span className={styles.summaryCountLabel}>当前已启用站点</span>
            <span className={styles.summaryCountValue}>
              {enabledCount} / {SOURCE_IDS.length}
            </span>
          </div>
        </div>
      </section>

      <div className={styles.cardList}>
        {sortedSites.map((site) => {
          const isEnabled = resolveSourceEnabled(site.id, { enabledSources })
          const isExpanded = isEnabled && expandedSites.includes(site.id)

          return (
            <article
              key={site.id}
              className={joinClassNames(
                styles.siteCard,
                isEnabled ? styles.isEnabled : styles.isDisabled
              )}
              data-testid={`site-card-${site.id}`}>
              <div className={styles.cardHeader}>
                <div className={styles.cardIdentity}>
                  <div className={styles.siteMark} aria-hidden="true">
                    <img
                      src={SITE_ICONS[site.id]}
                      alt=""
                      loading="eager"
                      decoding="async"
                      data-testid={`site-icon-${site.id}`}
                      className={styles.siteMarkIcon}
                    />
                  </div>
                  <div className={styles.siteInfo}>
                    <div className={styles.siteTitleRow}>
                      <Typography.Title level={3}>
                        {site.displayName}
                      </Typography.Title>
                      <span
                        className={joinClassNames(
                          styles.siteStatus,
                          isEnabled
                            ? styles.isStatusEnabled
                            : styles.isStatusDisabled
                        )}>
                        {isEnabled
                          ? site.badgeWhenEnabled
                          : site.badgeWhenDisabled}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.cardActions}>
                  <div className={styles.switchCluster}>
                    <span>启用</span>
                    <Switch
                      checked={isEnabled}
                      aria-label={`${site.navLabel} 启用开关`}
                      onChange={(checked) => {
                        form.setFieldValue(["enabledSources", site.id], checked)
                      }}
                    />
                  </div>
                  {isEnabled ? (
                    <button
                      type="button"
                      className={styles.expandButton}
                      aria-label={`${site.navLabel} ${isExpanded ? "收起" : "展开"}配置`}
                      onClick={() => toggleSiteExpanded(site.id)}>
                      {isExpanded ? (
                        <HiChevronUp aria-hidden="true" focusable="false" />
                      ) : (
                        <HiChevronDown aria-hidden="true" focusable="false" />
                      )}
                    </button>
                  ) : null}
                </div>
              </div>

              {isExpanded ? (
                <div className={styles.cardBody}>
                  {renderStrategySection(site)}
                  {site.hasKisssubScriptFields ? renderKisssubFields() : null}
                  {renderSiteNote(site)}
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
  )
}
