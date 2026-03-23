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
import type { BatchEventPayload, BatchItem, BatchLogItem } from "../lib/types"

export const config: PlasmoCSConfig = {
  matches: [
    "http://www.kisssub.org/*",
    "https://www.kisssub.org/*",
    "http://www.dongmanhuayuan.com/*",
    "https://www.dongmanhuayuan.com/*"
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
  running: boolean
  selected: Map<string, BatchItem>
  progressText: string
  statusText: string
  savePath: string
  savePathHint: string
  logs: BatchLogItem[]
}

const DEFAULT_SAVE_PATH_HINT =
  "留空则使用当前下载器默认目录。远程下载器请手动输入目标主机可识别的绝对路径。"

const activeSource = getSourceAdapterForLocation(window.location)

const snapshot: PanelSnapshot = {
  running: false,
  selected: new Map(),
  progressText: "等待操作",
  statusText: "就绪。先在当前列表页勾选资源。",
  savePath: "",
  savePathHint: DEFAULT_SAVE_PATH_HINT,
  logs: []
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
      selectedCount={snapshot.selected.size}
      running={snapshot.running}
      progressText={snapshot.progressText}
      statusText={snapshot.statusText}
      savePath={snapshot.savePath}
      savePathHint={snapshot.savePathHint}
      logs={snapshot.logs}
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

  renderAll()
}

function selectAllVisible() {
  for (const { item } of checkboxRoots.values()) {
    snapshot.selected.set(item.detailUrl, item)
  }

  renderAll()
}

function clearSelection() {
  snapshot.selected.clear()
  snapshot.statusText = "已清空当前选择。"
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
  snapshot.progressText = "准备中"
  const normalizedSavePath = snapshot.savePath.trim()
  snapshot.statusText = normalizedSavePath
    ? `开始处理 ${items.length} 项，后台会逐个打开详情页并提取真实链接，并请求保存到 ${normalizedSavePath}。`
    : `开始处理 ${items.length} 项，后台会逐个打开详情页并提取真实链接。当前使用下载器默认目录。`
  snapshot.logs = []
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
  if (typeof event.stats?.total === "number") {
    snapshot.progressText = `总数 ${event.stats.total} | 已处理 ${event.stats.processed || 0} | 已提取 ${
      event.stats.prepared || 0
    } | 已提交 ${event.stats.submitted || 0} | 重复 ${event.stats.duplicated || 0} | 失败 ${
      event.stats.failed || 0
    }`
  }

  if (event.stage === "started") {
    snapshot.running = true
    snapshot.statusText = event.message || "批量任务已启动。"
    renderAll()
    return
  }

  if (event.stage === "progress" && event.item) {
    snapshot.logs = [event.item, ...snapshot.logs].slice(0, 8)
    snapshot.statusText = event.item.message || "正在处理下一项。"
    renderAll()
    return
  }

  if (event.stage === "submitting") {
    snapshot.statusText = event.message || "正在提交到下载器。"
    renderAll()
    return
  }

  if (event.stage === "completed") {
    snapshot.running = false
    const summary = event.summary ?? { submitted: 0, duplicated: 0, failed: 0 }
    snapshot.statusText = `完成。成功提交 ${summary.submitted || 0} 项，重复 ${summary.duplicated || 0} 项，失败 ${
      summary.failed || 0
    } 项。`
    if (Array.isArray(event.results)) {
      snapshot.logs = event.results.slice(-8).reverse()
    }
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
