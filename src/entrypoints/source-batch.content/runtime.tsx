import type { Root } from "react-dom/client"
import { createRoot } from "react-dom/client"
import type { ContentScriptContext } from "wxt/utils/content-script-context"
import {
  createShadowRootUi,
  type ShadowRootContentScriptUi
} from "wxt/utils/content-script-ui/shadow-root"

import { BatchPanel } from "../../components/batch-panel"
import { createBatchPanelFilterStatus } from "../../components/batch-panel/filter-status"
import { SelectionCheckbox } from "../../components/selection-checkbox"
import { i18n } from "../../lib/i18n"
import {
  BATCH_EVENT,
  CONTENT_SETTINGS_CHANGED_EVENT,
  sendRuntimeRequest,
  type ContentRuntimeMessage
} from "../../lib/shared/messages"
import {
  getAnchorMountTarget,
  getBatchItemFromAnchor,
  getDetailAnchors,
  getEnabledSourceAdapterForLocation,
  getSourceAdapterForLocation
} from "../../lib/content/page"
import { buildSelectableBatchItem, type SelectableBatchItem } from "../../lib/content/filter-selection"
import { getBrowser, getExtensionUrl } from "../../lib/shared/browser"
import { getLocalizedSiteConfigMeta } from "../../lib/sources/site-meta"
import type { SourceAdapter } from "../../lib/sources/types"
import type { ContentScriptState } from "../../lib/background/queries/content-script-state"
import type { BatchEventPayload, BatchItem, FilterEntry } from "../../lib/shared/types"
import { FILTERS_ROUTE } from "../../lib/shared/options-routes"

type CheckboxMount = {
  item: SelectableBatchItem
  ui: ShadowRootContentScriptUi<Root>
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
  i18n.t("batch.advanced.savePathHintDefault")
const CONTENT_SCRIPT_STYLE_PATH = "/content-scripts/source-batch.css"

const ISOLATED_UI_EVENTS = [
  "click",
  "dblclick",
  "mousedown",
  "mouseup",
  "pointerdown",
  "pointerup",
  "touchstart",
  "touchend",
  "keydown",
  "keyup",
  "keypress"
] as const

let contentScriptUiCssPromise: Promise<string> | null = null

async function getContentScriptUiCss() {
  if (!contentScriptUiCssPromise) {
    contentScriptUiCssPromise = loadContentScriptUiCss()
  }

  return contentScriptUiCssPromise
}

async function loadContentScriptUiCss() {
  const url = getExtensionUrl(CONTENT_SCRIPT_STYLE_PATH)

  try {
    const css = await (await fetch(url)).text()
    return css.replaceAll(":root", ":host")
  } catch (error) {
    console.warn(`[Anime BT Batch] Failed to load content styles from ${url}.`, error)
    return ""
  }
}

export async function startSourceBatchContentScript(ctx: ContentScriptContext) {
  let matchedPageSource: SourceAdapter | null = null
  let activeSource: SourceAdapter | null = null
  let runtimeListenerRegistered = false

  const snapshot: PanelSnapshot = {
    isExpanded: true,
    running: false,
    selected: new Map(),
    statusText: i18n.t("content.status.ready"),
    savePath: "",
    savePathHint: DEFAULT_SAVE_PATH_HINT,
    filters: [],
    filterStatus: createBatchPanelFilterStatus({
      sourceId: "kisssub",
      filters: []
    })
  }

  const checkboxRoots = new Map<string, CheckboxMount>()
  let panelUi: ShadowRootContentScriptUi<Root> | null = null
  let observer: MutationObserver | null = null
  let observerTimer: number | null = null
  let contentSettingsRefreshInFlight: Promise<void> | null = null
  let contentSettingsRefreshQueued = false

  ctx.onInvalidated(() => {
    disconnectObserver()
    deactivateSource()
  })

  await bootstrap()

  async function bootstrap() {
    try {
      const matchedSource = getSourceAdapterForLocation(window.location)
      if (!matchedSource) {
        return
      }

      matchedPageSource = matchedSource
      registerRuntimeMessageListener()
      await requestContentSettingsRefresh()
    } catch (error) {
      console.error("[Anime BT Batch] Failed to bootstrap content script.", error)
    }
  }

  function registerRuntimeMessageListener() {
    if (runtimeListenerRegistered) {
      return
    }

    const extensionBrowser = getBrowser()

    const listener = (
      message: ContentRuntimeMessage,
      _sender: unknown,
      _sendResponse: unknown
    ) => {
      if (!message) {
        return
      }

      if (message.type === BATCH_EVENT) {
        handleBatchEvent(message)
        return
      }

      if (message.type === CONTENT_SETTINGS_CHANGED_EVENT) {
        void handleContentSettingsChanged()
        return
      }
    }

    extensionBrowser.runtime.onMessage.addListener(listener)
    ctx.onInvalidated(() => {
      extensionBrowser.runtime.onMessage.removeListener?.(listener)
    })

    runtimeListenerRegistered = true
  }

  async function requestContentSettingsRefresh(): Promise<void> {
    if (contentSettingsRefreshInFlight) {
      contentSettingsRefreshQueued = true
      return contentSettingsRefreshInFlight
    }

    const refreshPromise = (async () => {
      do {
        contentSettingsRefreshQueued = false
        await synchronizeContentSettings()
      } while (contentSettingsRefreshQueued)
    })()

    const trackedRefreshPromise = refreshPromise.finally(() => {
      if (contentSettingsRefreshInFlight === trackedRefreshPromise) {
        contentSettingsRefreshInFlight = null
      }
    })

    contentSettingsRefreshInFlight = trackedRefreshPromise
    return trackedRefreshPromise
  }

  async function loadContentScriptState(sourceId: SourceAdapter["id"]): Promise<ContentScriptState> {
    const response = await sendRuntimeRequest({
      type: "GET_CONTENT_SCRIPT_STATE",
      sourceId
    })

    if (!response.ok) {
      throw new Error(response.error || "Failed to load content script state.")
    }

    return response.state
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

    for (const [detailUrl, checkboxMount] of checkboxRoots.entries()) {
      const nextItem = buildSelectableBatchItem(checkboxMount.item.item, snapshot.filters)
      checkboxMount.item = nextItem

      if (!nextItem.selectable && snapshot.selected.delete(detailUrl)) {
        selectionChanged = true
      }
    }

    if (selectionChanged && !snapshot.running) {
      snapshot.statusText = buildSelectionStatus(snapshot.selected.size)
    }
  }

  async function synchronizeContentSettings() {
    if (!matchedPageSource) {
      return
    }

    const state = await loadContentScriptState(matchedPageSource.id)
    hydrateSavePath(state)

    const enabledSource = state.enabled
      ? matchedPageSource
      : null

    const filters = state.filters ?? []

    if (!enabledSource) {
      applyFiltersToSnapshot(matchedPageSource.id, filters)

      if (activeSource) {
        deactivateSource({ preserveRunningState: true })
      }

      return
    }

    applyFiltersToSnapshot(enabledSource.id, filters)

    if (!activeSource) {
      await activateSource(enabledSource)
      return
    }

    activeSource = enabledSource
    await scanAndDecorate(enabledSource)
    refreshSelectableItems()
    renderAll()
  }

  async function activateSource(source: SourceAdapter) {
    activeSource = source
    await mountPanel()
    observeMutations()
    await scanAndDecorate(source)
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

  async function mountPanel() {
    if (panelUi) {
      return
    }

    const css = await getContentScriptUiCss()

    panelUi = await createShadowRootUi(ctx, {
      name: "anime-bt-batch-panel",
      position: "inline",
      anchor: document.body,
      append: "last",
      css,
      isolateEvents: [...ISOLATED_UI_EVENTS],
      onMount(container, _shadow, shadowHost) {
        shadowHost.dataset.animeBtBatchPanelRoot = "1"
        const appRoot = document.createElement("div")
        container.appendChild(appRoot)
        return createRoot(appRoot)
      },
      onRemove(root) {
        root?.unmount()
      }
    })

    panelUi.mount()
    renderAll()
  }

  function unmountPanel() {
    panelUi?.remove()
    panelUi = null
  }

  function unmountCheckboxes() {
    for (const { ui } of checkboxRoots.values()) {
      ui.remove()
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

      observerTimer = ctx.setTimeout(() => {
        if (activeSource) {
          void scanAndDecorate(activeSource)
        }
        renderAll()
      }, 150)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  async function handleContentSettingsChanged() {
    if (!matchedPageSource) {
      return
    }

    try {
      await requestContentSettingsRefresh()
    } catch (error) {
      console.error("[Anime BT Batch] Failed to refresh content settings.", error)
    }
  }

  async function scanAndDecorate(source: SourceAdapter) {
    const pageUrl = new URL(window.location.href)
    const css = await getContentScriptUiCss()

    for (const anchor of getDetailAnchors(source, document, pageUrl)) {
      if (anchor.dataset.animeBtBatchDecorated === "1") {
        continue
      }

      const item = getBatchItemFromAnchor(source, anchor, pageUrl)
      if (!item || checkboxRoots.has(item.detailUrl)) {
        continue
      }

      const targetCell = getAnchorMountTarget(anchor)
      if (!targetCell) {
        continue
      }

      anchor.dataset.animeBtBatchDecorated = "1"

      try {
        const ui = await createShadowRootUi(ctx, {
          name: "anime-bt-batch-checkbox",
          position: "inline",
          anchor: targetCell,
          append: "first",
          css,
          isolateEvents: [...ISOLATED_UI_EVENTS],
          onMount(container, _shadow, shadowHost) {
            shadowHost.dataset.animeBtBatchCheckboxRoot = "1"
            const appRoot = document.createElement("span")
            container.appendChild(appRoot)
            return createRoot(appRoot)
          },
          onRemove(root) {
            root?.unmount()
          }
        })

        ui.mount()

        checkboxRoots.set(item.detailUrl, {
          item: buildSelectableBatchItem(item, snapshot.filters),
          ui
        })
      } catch (error) {
        console.error("[Anime BT Batch] Failed to mount injected checkbox.", error)
        delete anchor.dataset.animeBtBatchDecorated
      }
    }

    renderAll()
  }

  function renderAll() {
    renderPanel()
    renderCheckboxes()
  }

  function renderPanel() {
    panelUi?.mounted?.render(
      <BatchPanel
        sourceName={activeSource ? getLocalizedSiteConfigMeta(activeSource.id).displayName : undefined}
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
    for (const { item, ui } of checkboxRoots.values()) {
      const disabledReason =
        item.blockedReasonCode === "unmatched-rule"
          ? i18n.t("content.checkbox.unmatchedRule")
          : item.blockedReason || i18n.t("content.checkbox.unmatchedRule")

      ui.mounted?.render(
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
    snapshot.statusText = i18n.t("content.status.cleared")
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

  function hydrateSavePath(state: Pick<ContentScriptState, "lastSavePath">) {
    const loadedPath = String(state.lastSavePath ?? "").trim()
    if (!loadedPath) {
      return
    }

    snapshot.savePath = loadedPath
    snapshot.savePathHint = i18n.t("content.status.loadedLastPath", [loadedPath])
    renderAll()
  }

  async function startBatchDownload() {
    if (snapshot.running) {
      return
    }

    const items = Array.from(snapshot.selected.values())
    if (!items.length) {
      snapshot.statusText = i18n.t("content.status.noSelection")
      renderAll()
      return
    }

    snapshot.running = true
    const normalizedSavePath = snapshot.savePath.trim()
    snapshot.statusText = normalizedSavePath
      ? i18n.t("content.status.startWithPath", [items.length, normalizedSavePath])
      : i18n.t("content.status.startDefaultPath", [items.length])
    renderAll()

    const response = await sendRuntimeRequest({
      type: "START_BATCH_DOWNLOAD",
      items,
      savePath: normalizedSavePath
    })

    if (!response.ok) {
      snapshot.running = false
      snapshot.statusText = response.error || i18n.t("content.status.startFailed")
      renderAll()
    }
  }

  function handleBatchEvent(event: BatchEventPayload) {
    if (event.stage === "started") {
      snapshot.running = true
      const total = event.stats?.total || snapshot.selected.size
      snapshot.statusText = snapshot.savePath
        ? i18n.t("content.status.preparingWithCustomPath", [total])
        : i18n.t("content.status.preparingWithDefaultPath", [total])
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
        ? i18n.t("content.status.submittingPrepared", [prepared])
        : i18n.t("content.status.submitting")
      renderAll()
      return
    }

    if (event.stage === "completed") {
      snapshot.running = false
      const summary = event.summary ?? { submitted: 0, duplicated: 0, failed: 0 }
      snapshot.statusText = i18n.t("content.status.completed", [
        summary.submitted || 0,
        summary.duplicated || 0,
        summary.failed || 0
      ])
      renderAll()
      return
    }

    if (event.stage === "error" || event.stage === "fatal") {
      snapshot.running = false
      snapshot.statusText = event.error || i18n.t("content.status.failed")
      renderAll()
    }
  }
}

function buildSavePathHint(savePath: string) {
  const normalized = savePath.trim()
  return normalized
    ? i18n.t("content.status.savePathHint", [normalized])
    : DEFAULT_SAVE_PATH_HINT
}

function buildSelectionStatus(selectedCount: number) {
  return selectedCount > 0
    ? i18n.t("content.status.readyWithSelection", [selectedCount])
    : i18n.t("content.status.ready")
}

function buildProgressStatus(event: BatchEventPayload) {
  const processed = event.stats?.processed || 0
  const total = event.stats?.total || processed
  const itemStatus = event.item?.status

  if (itemStatus === "failed") {
    return i18n.t("content.status.progressFailed", [processed, total])
  }

  if (itemStatus === "duplicate") {
    return i18n.t("content.status.progressDuplicate", [processed, total])
  }

  return i18n.t("content.status.progressExtracting", [processed, total])
}
