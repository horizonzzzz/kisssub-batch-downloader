import { useMemo } from "react"

import { getDownloaderMeta } from "../../lib/downloader"
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom"

import type {
  SubscriptionEntry,
  TestDownloaderConnectionResult
} from "../../lib/shared/types"
import type { SubscriptionPolicyConfig } from "../../lib/subscriptions/policy/types"
import type { FilterConfig } from "../../lib/filter-rules/types"
import type { SourceConfig } from "../../lib/sources/config/types"
import type { DownloaderConfig } from "../../lib/downloader/config/types"
import type { BatchExecutionConfig } from "../../lib/batch-config/types"
import type { BatchUiPreferences } from "../../lib/batch-preferences/types"
import type { DownloaderId } from "../../lib/shared/types"
import {
  DEFAULT_OPTIONS_ROUTE,
  getOptionsRoutes,
  getOptionsRouteMeta
} from "./config/routes"
import { PageShell } from "./layout/PageShell"
import { OptionsSidebar } from "./layout/OptionsSidebar"
import { GeneralSettingsPage } from "./pages/general/GeneralSettingsPage"
import { FiltersPage } from "./pages/filters/FiltersPage"
import { HistoryPage } from "./pages/history/HistoryPage"
import { OverviewPage } from "./pages/overview/OverviewPage"
import { SitesPage } from "./pages/sites/SitesPage"
import { SubscriptionsPage } from "./pages/subscriptions/SubscriptionsPage"
import {
  DownloaderWorkbenchProvider,
  useDownloaderWorkbench
} from "./pages/general/downloader-workbench-context"

export type OptionsApi = {
  testConnection: (config: DownloaderConfig) => Promise<TestDownloaderConnectionResult>
  getFilterConfig: () => Promise<FilterConfig>
  saveFilterConfig: (config: FilterConfig) => Promise<FilterConfig>
  getSourceConfig: () => Promise<SourceConfig>
  saveSourceConfig: (config: SourceConfig) => Promise<SourceConfig>
  getDownloaderConfig: () => Promise<DownloaderConfig>
  saveDownloaderConfig: (config: DownloaderConfig) => Promise<DownloaderConfig>
  getBatchExecutionConfig: () => Promise<BatchExecutionConfig>
  saveBatchExecutionConfig: (config: BatchExecutionConfig) => Promise<BatchExecutionConfig>
  saveGeneralSettings: (payload: {
    downloaderConfig: DownloaderConfig
    batchExecutionConfig: BatchExecutionConfig
  }) => Promise<{
    downloaderConfig: DownloaderConfig
    batchExecutionConfig: BatchExecutionConfig
  }>
  getBatchUiPreferences: () => Promise<BatchUiPreferences>
  saveBatchUiPreferences: (preferences: Partial<BatchUiPreferences>) => Promise<BatchUiPreferences>
  getSubscriptionPolicy: () => Promise<SubscriptionPolicyConfig>
  saveSubscriptionPolicy: (config: SubscriptionPolicyConfig) => Promise<SubscriptionPolicyConfig>
  upsertSubscription: (subscription: SubscriptionEntry) => Promise<void>
  deleteSubscription: (subscriptionId: string) => Promise<void>
}

type OptionsPageProps = {
  api: OptionsApi
}

function OptionsWorkspace({ api }: OptionsPageProps) {
  return (
    <DownloaderWorkbenchProvider api={api}>
      <OptionsWorkspaceContent api={api} />
    </DownloaderWorkbenchProvider>
  )
}

function OptionsWorkspaceContent({ api }: OptionsPageProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const downloaderWorkbench = useDownloaderWorkbench()
  const activeMeta = useMemo(
    () => getOptionsRouteMeta(location.pathname),
    [location.pathname]
  )
  const localizedRoutes = useMemo(() => getOptionsRoutes(), [])
  const currentDownloaderName = getDownloaderMeta(downloaderWorkbench.config.activeId).displayName

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 lg:flex-row lg:items-start">
      <OptionsSidebar
        routes={localizedRoutes}
        activePath={activeMeta.path}
        currentDownloaderName={currentDownloaderName}
        onNavigate={navigate}
      />
      <PageShell activeMeta={activeMeta}>
        <Routes>
          <Route path="/" element={<Navigate to={DEFAULT_OPTIONS_ROUTE} replace />} />
          <Route path="/general" element={<GeneralSettingsPage api={api} />} />
          <Route path="/sites" element={<SitesPage api={api} />} />
          <Route path="/filters" element={<FiltersPage api={api} />} />
          <Route path="/subscriptions" element={<SubscriptionsPage api={api} />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="*" element={<Navigate to={DEFAULT_OPTIONS_ROUTE} replace />} />
        </Routes>
      </PageShell>
    </div>
  )
}

export function OptionsPage({ api }: OptionsPageProps) {
  return (
    <HashRouter>
      <OptionsWorkspace api={api} />
    </HashRouter>
  )
}
