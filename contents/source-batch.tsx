import type { Root } from "react-dom/client"
import { createRoot } from "react-dom/client"
import type { PlasmoCSConfig } from "plasmo"

import { BatchPanel } from "../components/batch-panel"
import { createBatchPanelFilterStatus } from "../components/batch-panel/filter-status"
import { SelectionCheckbox } from "../components/selection-checkbox"
import {
  BATCH_EVENT,
  FILTERS_UPDATED_EVENT,
  SOURCE_ENABLED_CHANGE_EVENT,
  sendRuntimeRequest,
  type ContentRuntimeMessage,
  type SourceEnabledChangeMessage
} from "../lib/shared/messages"
import {
  getAnchorMountTarget,
  getBatchItemFromAnchor,
  getDetailAnchors,
  getSourceAdapterForLocation,
  getEnabledSourceAdapterForLocation
} from "../lib/content/page"
import { createShadowMountHost, ensureShadowStyle } from "../lib/content/shadow-root"
import { buildSelectableBatchItem, type SelectableBatchItem } from "../lib/content/filter-selection"
import type { SourceAdapter } from "../lib/sources/types"
import type { BatchEventPayload, BatchItem, FilterEntry, Settings } from "../lib/shared/types"
import { FILTERS_ROUTE } from "../lib/shared/options-routes"
import contentStyleText from "../styles/content-style-text"

export default function SourceBatchContentScript() {
  return null
}

// Keep these patterns as a local literal so Plasmo can statically analyze them.
const CONTENT_SCRIPT_MATCH_PATTERNS = [
  "*://*.kisssub.org/*",
  "*://*.dongmanhuayuan.com/*",
  "*://*.acg.rip/*",
  "*://*.bangumi.moe/*"
]

export const config: PlasmoCSConfig = {
  matches: CONTENT_SCRIPT_MATCH_PATTERNS,
  run_at: "document_idle"
}

type CheckboxRoot = {
  host: HTMLSpanElement
  root: Root
  item: SelectableBatchItem
}

type PanelSnapshot = {
  isExpanded: boolean
  running: boolean
  selected: Map<string, BatchItem>
  statusText: string
  savePath: string
  savePathHint: string
  filters: FilterEntry[]
  filterStatus: ReturnType<typeof createBatchPanelFilterStatus>
}

const DEFAULT_SAVE_PATH_HINT =
  "留空则使用当前下载器默认目录。远程下载器请手动输入目标主机可识别的绝对路径。"

let matchedPageSource: SourceAdapter | null = null
let activeSource: SourceAdapter | null = null
let runtimeListenerRegistered = false

const snapshot: PanelSnapshot = {
  isExpanded: true,
  running: false,
  selected: new Map(),
  statusText: "就绪。先在当前列表页勾选资源。",
  savePath: "",
  savePathHint: DEFAULT_SAVE_PATH_HINT,
  filters: [],
  filterStatus: createBatchPanelFilterStatus({
    sourceId: "kisssub",
    filters: []
  })
}

const checkboxRoots = new Map<string, CheckboxRoot>()
let panelRoot: Root | null = null
let panelHost: HTMLDivElement | null = null
let observer: MutationObserver | null = null
let observerTimer: ReturnType<typeof globalThis.setTimeout> | null = null

void bootstrap()

async function bootstrap() {
  try {
    const matchedSource = getSourceAdapterForLocation(window.location)
    if (!matchedSource) {
      return
    }

    matchedPageSource = matchedSource
    registerRuntimeMessageListener()
    await synchronizeContentSettings()
  } catch (error) {
    console.error("[Anime BT Batch] Failed to bootstrap content script.", error)
  }
}

function registerRuntimeMessageListener() {
  if (runtimeListenerRegistered) {
    return
  }

  chrome.runtime.onMessage.addListener((message: ContentRuntimeMessage) => {
    if (!message) {
      return
    }

    if (message.type === BATCH_EVENT) {
      handleBatchEvent(message)
      return
    }

    if (message.type === SOURCE_ENABLED_CHANGE_EVENT) {
      handleSourceEnabledChange(message)
      return
    }

    if (message.type === FILTERS_UPDATED_EVENT) {
      void handleFiltersUpdated()
    }
  })

  runtimeListenerRegistered = true
}

async function loadSettingsForContentScript(): Promise<Settings> {
  const response = await sendRuntimeRequest({
    type: "GET_SETTINGS"
  })

  if (!response.ok) {
    throw new Error(response.error || "Failed to load settings for the content script.")
  }

  return response.settings
}

function applyFiltersToSnapshot(sourceId: SourceAdapter["id"], filters: FilterEntry[]) {
  snapshot.filters = filters
  snapshot.filterStatus = createBatchPanelFilterStatus({
    sourceId,
    filters
  })
}

function refreshSelectableItems() {
  let selectionChanged = false

  for (const [detailUrl, checkboxRoot] of checkboxRoots.entries()) {
    const nextItem = buildSelectableBatchItem(checkboxRoot.item.item, snapshot.filters)
    checkboxRoot.item = nextItem

    if (!nextItem.selectable && snapshot.selected.delete(detailUrl)) {
      selectionChanged = true
    }
  }

  if (selectionChanged && !snapshot.running) {
    snapshot.statusText = buildSelectionStatus(snapshot.selected.size)
  }
}

async function synchronizeContentSettings() {
  const settings = await loadSettingsForContentScript()
  hydrateSavePath(settings)

  const enabledSource = getEnabledSourceAdapterForLocation(window.location, settings)
  const filters = settings.filters ?? []

  if (!enabledSource) {
    applyFiltersToSnapshot(matchedPageSource?.id ?? "kisssub", filters)

    if (activeSource) {
      deactivateSource({ preserveRunningState: true })
    }

    return
  }

  applyFiltersToSnapshot(enabledSource.id, filters)

  if (!activeSource) {
    activateSource(enabledSource)
    return
  }

  activeSource = enabledSource
  scanAndDecorate(enabledSource)
  refreshSelectableItems()
  renderAll()
}

function activateSource(source: SourceAdapter) {
  activeSource = source
  mountPanel()
  observeMutations()
  scanAndDecorate(source)
  if (!snapshot.running && snapshot.selected.size === 0) {
    snapshot.statusText = buildSelectionStatus(0)
  }
  renderAll()
}

function deactivateSource(options?: { preserveRunningState?: boolean }) {
  const shouldPreserveInFlight = options?.preserveRunningState && snapshot.running

  activeSource = null
  disconnectObserver()

  if (!shouldPreserveInFlight) {
    snapshot.running = false
    snapshot.selected.clear()
    snapshot.statusText = buildSelectionStatus(0)
  }

  unmountCheckboxes()
  resetDecoratedAnchors()
  unmountPanel()
}

function mountPanel() {
  if (panelRoot) {
    return
  }

  const mount = createShadowMountHost({
    hostTagName: "div",
    dataset: {
      animeBtBatchPanelRoot: "1"
    },
    parent: document.body
  })

  panelHost = mount.host
  panelRoot = createRoot(mount.container)
  ensureMountedUiStyles()
  renderAll()
}

function unmountPanel() {
  if (panelRoot) {
    panelRoot.unmount()
  }

  if (panelHost) {
    panelHost.remove()
  }

  panelHost = null
  panelRoot = null
}

function unmountCheckboxes() {
  for (const { host, root } of checkboxRoots.values()) {
    root.unmount()
    host.remove()
  }

  checkboxRoots.clear()
}

function resetDecoratedAnchors() {
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>("[data-anime-bt-batch-decorated='1']")) {
    delete anchor.dataset.animeBtBatchDecorated
  }
}

function disconnectObserver() {
  if (observerTimer !== null) {
    globalThis.clearTimeout(observerTimer)
    observerTimer = null
  }

  if (observer) {
    observer.disconnect()
    observer = null
  }
}

function observeMutations() {
  if (observer) {
    return
  }

  observer = new MutationObserver(() => {
    if (observerTimer !== null) {
      globalThis.clearTimeout(observerTimer)
    }

    observerTimer = globalThis.setTimeout(() => {
      if (activeSource) {
        scanAndDecorate(activeSource)
      }
      renderAll()
    }, 150)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
}

function handleSourceEnabledChange(message: SourceEnabledChangeMessage) {
  if (!matchedPageSource || matchedPageSource.id !== message.sourceId) {
    return
  }

  if (message.enabled) {
    activateSource(matchedPageSource)
    return
  }

  deactivateSource({ preserveRunningState: true })
}

async function handleFiltersUpdated() {
  if (!matchedPageSource) {
    return
  }

  try {
    await synchronizeContentSettings()
  } catch (error) {
    console.error("[Anime BT Batch] Failed to refresh filter settings.", error)
  }
}

function scanAndDecorate(source: SourceAdapter) {
  const pageUrl = new URL(window.location.href)

  for (const anchor of getDetailAnchors(source, document, pageUrl)) {
    if (anchor.dataset.animeBtBatchDecorated === "1") {
      continue
    }

    const item = getBatchItemFromAnchor(source, anchor, pageUrl)
    if (!item) {
      continue
    }

    const targetCell = getAnchorMountTarget(anchor)
    if (!targetCell) {
      continue
    }

    const mount = createShadowMountHost({
      hostTagName: "span",
      containerTagName: "span",
      dataset: {
        animeBtBatchCheckboxRoot: "1"
      },
      parent: targetCell,
      before: targetCell.firstChild
    })

    const root = createRoot(mount.container)
    const selectableItem = buildSelectableBatchItem(item, snapshot.filters)
    checkboxRoots.set(item.detailUrl, {
      host: mount.host,
      root,
      item: selectableItem
    })
    ensureMountedUiStyles()

    anchor.dataset.animeBtBatchDecorated = "1"
  }
}

function renderAll() {
  ensureMountedUiStyles()
  renderPanel()
  renderCheckboxes()
}

function ensureMountedUiStyles() {
  if (panelHost?.shadowRoot) {
    ensureShadowStyle(panelHost.shadowRoot, "content-ui", contentStyleText)
  }

  for (const { host } of checkboxRoots.values()) {
    if (host.shadowRoot) {
      ensureShadowStyle(host.shadowRoot, "content-ui", contentStyleText)
    }
  }
}

function renderPanel() {
  if (!panelRoot) {
    return
  }

  panelRoot.render(
    <BatchPanel
      sourceName={activeSource?.displayName}
      isExpanded={snapshot.isExpanded}
      selectedCount={snapshot.selected.size}
      selectableCount={Array.from(checkboxRoots.values()).filter(({ item }) => item.selectable).length}
      running={snapshot.running}
      statusText={snapshot.statusText}
      savePath={snapshot.savePath}
      savePathHint={snapshot.savePathHint}
      filterStatus={snapshot.filterStatus}
      onToggleExpanded={updateExpanded}
      onSelectAll={selectAllVisible}
      onClear={clearSelection}
      onSavePathChange={updateSavePath}
      onClearSavePath={clearSavePath}
      onDownload={() => {
        void startBatchDownload()
      }}
      onOpenSettings={() => {
        void sendRuntimeRequest({ type: "OPEN_OPTIONS_PAGE", route: FILTERS_ROUTE })
      }}
    />
  )
}

function renderCheckboxes() {
  for (const { item, root } of checkboxRoots.values()) {
    const disabledReason =
      item.blockedReasonCode === "unmatched-rule"
        ? "该条目未命中当前筛选规则，无法选择"
        : item.blockedReason || "该条目未命中当前筛选规则，无法选择"

    root.render(
      <SelectionCheckbox
        checked={item.selectable && snapshot.selected.has(item.item.detailUrl)}
        disabled={!item.selectable}
        disabledReason={disabledReason}
        onChange={(checked) => {
          toggleSelection(item, checked)
        }}
      />
    )
  }
}

function toggleSelection(item: SelectableBatchItem, checked: boolean) {
  if (!item.selectable) {
    return
  }

  if (checked) {
    snapshot.selected.set(item.item.detailUrl, item.item)
  } else {
    snapshot.selected.delete(item.item.detailUrl)
  }

  if (!snapshot.running) {
    snapshot.statusText = buildSelectionStatus(snapshot.selected.size)
  }

  renderAll()
}

function selectAllVisible() {
  for (const { item } of checkboxRoots.values()) {
    if (!item.selectable) {
      snapshot.selected.delete(item.item.detailUrl)
      continue
    }

    snapshot.selected.set(item.item.detailUrl, item.item)
  }

  snapshot.statusText = buildSelectionStatus(snapshot.selected.size)
  renderAll()
}

function clearSelection() {
  snapshot.selected.clear()
  snapshot.statusText = "已清空当前选择。"
  renderAll()
}

function updateExpanded(expanded: boolean) {
  snapshot.isExpanded = expanded
  renderAll()
}

function updateSavePath(value: string) {
  snapshot.savePath = value
  snapshot.savePathHint = buildSavePathHint(value)
  renderAll()
}

function clearSavePath() {
  snapshot.savePath = ""
  snapshot.savePathHint = DEFAULT_SAVE_PATH_HINT
  renderAll()
}

function hydrateSavePath(settings: Pick<Settings, "lastSavePath">) {
  const loadedPath = String(settings.lastSavePath ?? "").trim()
  if (!loadedPath) {
    return
  }

  snapshot.savePath = loadedPath
  snapshot.savePathHint = `已载入上次使用的路径：${loadedPath}`
  renderAll()
}

async function startBatchDownload() {
  if (snapshot.running) {
    return
  }

  const items = Array.from(snapshot.selected.values())
  if (!items.length) {
    snapshot.statusText = "还没有选中任何帖子。"
    renderAll()
    return
  }

  snapshot.running = true
  const normalizedSavePath = snapshot.savePath.trim()
  snapshot.statusText = normalizedSavePath
    ? `开始处理 ${items.length} 项，完成后将请求保存到 ${normalizedSavePath}。`
    : `开始处理 ${items.length} 项，完成后将使用下载器默认目录。`
  renderAll()

  const response = await sendRuntimeRequest({
    type: "START_BATCH_DOWNLOAD",
    items,
    savePath: normalizedSavePath
  })

  if (!response.ok) {
    snapshot.running = false
    snapshot.statusText = response.error || "无法启动批量下载任务。"
    renderAll()
  }
}

function handleBatchEvent(event: BatchEventPayload) {
  if (event.stage === "started") {
    snapshot.running = true
    const total = event.stats?.total || snapshot.selected.size
    snapshot.statusText = snapshot.savePath
      ? `正在整理 ${total} 项资源，稍后将发送到自定义目录。`
      : `正在整理 ${total} 项资源，稍后将发送到下载器默认目录。`
    renderAll()
    return
  }

  if (event.stage === "progress") {
    snapshot.statusText = buildProgressStatus(event)
    renderAll()
    return
  }

  if (event.stage === "submitting") {
    const prepared = event.stats?.prepared || 0
    snapshot.statusText = prepared
      ? `正在提交到 qBittorrent，当前共有 ${prepared} 项待发送。`
      : "正在提交到 qBittorrent。"
    renderAll()
    return
  }

  if (event.stage === "completed") {
    snapshot.running = false
    const summary = event.summary ?? { submitted: 0, duplicated: 0, failed: 0 }
    snapshot.statusText = `完成。成功提交 ${summary.submitted || 0} 项，重复 ${summary.duplicated || 0} 项，失败 ${summary.failed || 0} 项。`
    renderAll()
    return
  }

  if (event.stage === "error" || event.stage === "fatal") {
    snapshot.running = false
    snapshot.statusText = event.error || "批量任务失败。"
    renderAll()
  }
}

function buildSavePathHint(savePath: string) {
  const normalized = savePath.trim()
  return normalized
    ? `本次任务将请求下载器保存到：${normalized}`
    : DEFAULT_SAVE_PATH_HINT
}

function buildSelectionStatus(selectedCount: number) {
  return selectedCount > 0
    ? `已选 ${selectedCount} 项，可直接发起批量下载。`
    : "就绪。先在当前列表页勾选资源。"
}

function buildProgressStatus(event: BatchEventPayload) {
  const processed = event.stats?.processed || 0
  const total = event.stats?.total || processed
  const itemStatus = event.item?.status

  if (itemStatus === "failed") {
    return `已处理 ${processed}/${total} 项，部分资源提取失败。`
  }

  if (itemStatus === "duplicate") {
    return `已处理 ${processed}/${total} 项，检测到重复资源。`
  }

  return `正在提取真实链接（${processed}/${total}）。`
}
