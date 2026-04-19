import { useMemo } from "react"

import { FormProvider, useWatch } from "react-hook-form"
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom"

import { getDownloaderMeta } from "../../lib/downloader"
import type {
  AppSettings,
  SubscriptionEntry,
  TestDownloaderConnectionResult
} from "../../lib/shared/types"
import type { FilterConfig } from "../../lib/filter-rules/types"
import {
  DEFAULT_OPTIONS_ROUTE,
  getOptionsRoutes,
  getOptionsRouteMeta
} from "./config/routes"
import { useSettingsForm } from "./hooks/use-settings-form"
import type { EditableSettingsPayload } from "./schema/settings-form"
import { PageShell } from "./layout/PageShell"
import { OptionsSidebar } from "./layout/OptionsSidebar"
import { GeneralSettingsPage } from "./pages/general/GeneralSettingsPage"
import { FiltersPage } from "./pages/filters/FiltersPage"
import { HistoryPage } from "./pages/history/HistoryPage"
import { OverviewPage } from "./pages/overview/OverviewPage"
import { SitesPage } from "./pages/sites/SitesPage"
import { SubscriptionsPage } from "./pages/subscriptions/SubscriptionsPage"

export type SettingsFormApi = {
  loadAppSettings: () => Promise<AppSettings>
  saveAppSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>
  testConnection: (settings: EditableSettingsPayload) => Promise<TestDownloaderConnectionResult>
}

export type OptionsApi = SettingsFormApi & {
  upsertSubscription: (subscription: SubscriptionEntry) => Promise<void>
  deleteSubscription: (subscriptionId: string) => Promise<void>
  getFilterConfig: () => Promise<FilterConfig>
  saveFilterConfig: (config: FilterConfig) => Promise<FilterConfig>
}

type OptionsPageProps = {
  api: OptionsApi
}

type FormShellProps = {
  activeMeta: ReturnType<typeof getOptionsRouteMeta>
  form: ReturnType<typeof useSettingsForm>["form"]
  status: ReturnType<typeof useSettingsForm>["status"]
  saving: ReturnType<typeof useSettingsForm>["saving"]
  connectionState: ReturnType<typeof useSettingsForm>["connectionState"]
  connectionMessage: ReturnType<typeof useSettingsForm>["connectionMessage"]
  testing: ReturnType<typeof useSettingsForm>["testing"]
  handleSave: ReturnType<typeof useSettingsForm>["handleSave"]
  handleTestConnection: ReturnType<typeof useSettingsForm>["handleTestConnection"]
}

function FormShell({
  activeMeta,
  form,
  status,
  saving,
  connectionState,
  connectionMessage,
  testing,
  handleSave,
  handleTestConnection
}: FormShellProps) {
  return (
    <FormProvider {...form}>
      <PageShell activeMeta={activeMeta} status={status} saving={saving} onSubmit={handleSave}>
        <Routes>
          <Route path="/" element={<Navigate to={DEFAULT_OPTIONS_ROUTE} replace />} />
          <Route
            path="/general"
            element={
              <GeneralSettingsPage
                connectionMessage={connectionMessage}
                connectionState={connectionState}
                testing={testing}
                onTestConnection={handleTestConnection}
              />
            }
          />
          <Route path="/sites" element={<SitesPage />} />
          <Route path="*" element={<Navigate to={DEFAULT_OPTIONS_ROUTE} replace />} />
        </Routes>
      </PageShell>
    </FormProvider>
  )
}

function ViewShell({
  activeMeta,
  api
}: {
  activeMeta: ReturnType<typeof getOptionsRouteMeta>
  api: OptionsApi
}) {
  return (
    <PageShell activeMeta={activeMeta}>
      <Routes>
        <Route path="/filters" element={<FiltersPage api={api} />} />
        <Route path="/subscriptions" element={<SubscriptionsPage api={api} />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="*" element={<Navigate to={DEFAULT_OPTIONS_ROUTE} replace />} />
      </Routes>
    </PageShell>
  )
}

function OptionsWorkspace({ api }: OptionsPageProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const activeMeta = useMemo(
    () => getOptionsRouteMeta(location.pathname),
    [location.pathname]
  )
  const localizedRoutes = useMemo(() => getOptionsRoutes(), [])
  const formApi = useMemo<SettingsFormApi>(
    () => ({
      loadAppSettings: api.loadAppSettings,
      saveAppSettings: api.saveAppSettings,
      testConnection: api.testConnection
    }),
    [api]
  )

  const {
    form,
    status,
    connectionState,
    connectionMessage,
    saving,
    testing,
    handleSave,
    handleTestConnection
  } = useSettingsForm(formApi)
  const currentDownloaderId = useWatch({
    control: form.control,
    name: "currentDownloaderId"
  })
  const currentDownloaderName = getDownloaderMeta(currentDownloaderId).displayName

  const routeContent =
    activeMeta.mode === "form" ? (
      <FormShell
        activeMeta={activeMeta}
        form={form}
        status={status}
        saving={saving}
        connectionState={connectionState}
        connectionMessage={connectionMessage}
        testing={testing}
        handleSave={handleSave}
        handleTestConnection={handleTestConnection}
      />
    ) : (
      <ViewShell activeMeta={activeMeta} api={api} />
    )

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 lg:flex lg:items-start">
      <OptionsSidebar
        routes={localizedRoutes}
        activePath={activeMeta.path}
        currentDownloaderName={currentDownloaderName}
        onNavigate={navigate}
      />
      {routeContent}
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
