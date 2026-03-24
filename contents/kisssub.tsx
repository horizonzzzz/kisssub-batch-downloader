import type { Root } from "react-dom/client"
import { createRoot } from "react-dom/client"
import type { PlasmoCSConfig } from "plasmo"

import { BatchPanel } from "../components/batch-panel"
import { SelectionCheckbox } from "../components/selection-checkbox"
import { BATCH_EVENT } from "../lib/constants"
import {
  getAnchorMountTarget,
  getBatchItemFromAnchor,
  getDetailAnchors,
  getSourceAdapterForLocation
} from "../lib/content-page"
import type { SourceAdapter } from "../lib/sources/types"
import type { BatchEventPayload, BatchItem } from "../lib/types"

export default function KisssubContentScript() {
  return null
}

export const config: PlasmoCSConfig = {
  matches: [
    "http://www.kisssub.org/*",
    "https://www.kisssub.org/*",
    "http://www.dongmanhuayuan.com/*",
    "https://www.dongmanhuayuan.com/*",
    "http://acg.rip/*",
    "https://acg.rip/*"
  ],
  run_at: "document_idle",
  css: ["./kisssub.css"]
}

type CheckboxRoot = {
  container: HTMLSpanElement
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

const activeSource = getSourceAdapterForLocation(window.location)

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
let panelContainer: HTMLDivElement | null = null
let observer: MutationObserver | null = null

if (activeSource) {
  mountPanel()
  void hydrateSavePath()
  scanAndDecorate(activeSource)
  if (checkboxRoots.size > 0) {
    observeMutations()
    chrome.runtime.onMessage.addListener((message: { type?: string } & BatchEventPayload) => {
      if (!message || message.type !== BATCH_EVENT) {
        return
      }

      handleBatchEvent(message)
    })
  } else {
    document.querySelector(".kisssub-batch-panel-root")?.remove()
    panelContainer = null
    panelRoot = null
  }
}

function mountPanel() {
  if (panelRoot) {
    return
  }

  panelContainer = document.createElement("div")
  panelContainer.className = "kisssub-batch-panel-root"
  document.body.appendChild(panelContainer)
  panelRoot = createRoot(panelContainer)
  renderAll()
}

function observeMutations() {
  let timer = 0
  observer = new MutationObserver(() => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
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
    if (anchor.dataset.kisssubBatchDecorated === "1") {
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

    const container = document.createElement("span")
    container.className = "kisssub-batch-checkbox-root"

    if (targetCell.firstChild) {
      targetCell.insertBefore(container, targetCell.firstChild)
    } else {
      targetCell.appendChild(container)
    }

    const root = createRoot(container)
    checkboxRoots.set(item.detailUrl, {
      container,
      root,
      item
    })

    anchor.dataset.kisssubBatchDecorated = "1"
  }
}

function renderAll() {
  renderPanel()
  renderCheckboxes()
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
        void chrome.runtime.sendMessage({ type: "OPEN_OPTIONS_PAGE" })
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

async function hydrateSavePath() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: "GET_SETTINGS"
    })

    if (!response?.ok) {
      return
    }

    const loadedPath = String((response.settings as { lastSavePath?: string } | undefined)?.lastSavePath ?? "").trim()
    if (!loadedPath) {
      return
    }

    snapshot.savePath = loadedPath
    snapshot.savePathHint = `已载入上次使用的路径：${loadedPath}`
    renderAll()
  } catch {
    // Ignore initialization failures and keep the panel usable.
  }
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

  const response = await chrome.runtime.sendMessage({
    type: "START_BATCH_DOWNLOAD",
    items,
    savePath: normalizedSavePath
  })

  if (!response?.ok) {
    snapshot.running = false
    snapshot.statusText = response?.error ?? "无法启动批量下载任务。"
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
