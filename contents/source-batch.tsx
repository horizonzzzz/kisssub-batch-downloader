import type { Root } from "react-dom/client"
import { createRoot } from "react-dom/client"
import type { PlasmoCSConfig } from "plasmo"

import { BatchPanel } from "../components/batch-panel"
import { SelectionCheckbox } from "../components/selection-checkbox"
import { BATCH_EVENT, sendRuntimeRequest } from "../lib/shared/messages"
import {
  getAnchorMountTarget,
  getBatchItemFromAnchor,
  getDetailAnchors,
  getSourceAdapterForLocation,
  getEnabledSourceAdapterForLocation
} from "../lib/content/page"
import { createShadowMountHost, ensureShadowStyle } from "../lib/content/shadow-root"
import type { SourceAdapter } from "../lib/sources/types"
import type { BatchEventPayload, BatchItem, Settings } from "../lib/shared/types"
import contentStyleText from "../styles/content-style-text"

export default function SourceBatchContentScript() {
  return null
}

export const config: PlasmoCSConfig = {
  matches: [
    "http://www.kisssub.org/*",
    "https://www.kisssub.org/*",
    "http://www.dongmanhuayuan.com/*",
    "https://www.dongmanhuayuan.com/*",
    "http://acg.rip/*",
    "https://acg.rip/*",
    "http://bangumi.moe/*",
    "https://bangumi.moe/*"
  ],
  run_at: "document_idle"
}

type CheckboxRoot = {
  host: HTMLSpanElement
  root: Root
  item: BatchItem
}

type PanelSnapshot = {
  isExpanded: boolean
  running: boolean
  selected: Map<string, BatchItem>
  statusText: string
  savePath: string
  savePathHint: string
}

const DEFAULT_SAVE_PATH_HINT =
  "留空则使用当前下载器默认目录。远程下载器请手动输入目标主机可识别的绝对路径。"

let activeSource: SourceAdapter | null = null

const snapshot: PanelSnapshot = {
  isExpanded: true,
  running: false,
  selected: new Map(),
  statusText: "就绪。先在当前列表页勾选资源。",
  savePath: "",
  savePathHint: DEFAULT_SAVE_PATH_HINT
}

const checkboxRoots = new Map<string, CheckboxRoot>()
let panelRoot: Root | null = null
let panelHost: HTMLDivElement | null = null
let observer: MutationObserver | null = null

void bootstrap()

async function bootstrap() {
  try {
    const matchedSource = getSourceAdapterForLocation(window.location)
    if (!matchedSource) {
      return
    }

    const settings = await loadSettingsForContentScript()
    const source = getEnabledSourceAdapterForLocation(window.location, settings)
    if (!source) {
      return
    }

    activeSource = source
    mountPanel()
    hydrateSavePath(settings)
    scanAndDecorate(source)
    renderAll()
    observeMutations()
    registerBatchEventListener()
  } catch (error) {
    console.error("[Anime BT Batch] Failed to bootstrap content script.", error)
  }
}

function registerBatchEventListener() {
  chrome.runtime.onMessage.addListener((message: { type?: string } & BatchEventPayload) => {
    if (!message || message.type !== BATCH_EVENT) {
      return
    }

    handleBatchEvent(message)
  })
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

function observeMutations() {
  let timer: ReturnType<typeof globalThis.setTimeout> | null = null
  observer = new MutationObserver(() => {
    if (timer !== null) {
      globalThis.clearTimeout(timer)
    }

    timer = globalThis.setTimeout(() => {
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
    checkboxRoots.set(item.detailUrl, {
      host: mount.host,
      root,
      item
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
      running={snapshot.running}
      statusText={snapshot.statusText}
      savePath={snapshot.savePath}
      savePathHint={snapshot.savePathHint}
      onToggleExpanded={updateExpanded}
      onSelectAll={selectAllVisible}
      onClear={clearSelection}
      onSavePathChange={updateSavePath}
      onClearSavePath={clearSavePath}
      onDownload={() => {
        void startBatchDownload()
      }}
      onOpenSettings={() => {
        void sendRuntimeRequest({ type: "OPEN_OPTIONS_PAGE" })
      }}
    />
  )
}

function renderCheckboxes() {
  for (const { item, root } of checkboxRoots.values()) {
    root.render(
      <SelectionCheckbox
        checked={snapshot.selected.has(item.detailUrl)}
        onChange={(checked) => {
          toggleSelection(item, checked)
        }}
      />
    )
  }
}

function toggleSelection(item: BatchItem, checked: boolean) {
  if (checked) {
    snapshot.selected.set(item.detailUrl, item)
  } else {
    snapshot.selected.delete(item.detailUrl)
  }

  if (!snapshot.running) {
    snapshot.statusText = buildSelectionStatus(snapshot.selected.size)
  }

  renderAll()
}

function selectAllVisible() {
  for (const { item } of checkboxRoots.values()) {
    snapshot.selected.set(item.detailUrl, item)
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
    snapshot.statusText = `完成。成功提交 ${summary.submitted || 0} 项，重复 ${summary.duplicated || 0} 项，失败 ${
      summary.failed || 0
    } 项。`
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
