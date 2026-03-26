import { useMemo } from "react"

import { FormProvider } from "react-hook-form"
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate
} from "react-router-dom"

import type { Settings, TestQbConnectionResult } from "../../lib/types"
import {
  DEFAULT_OPTIONS_ROUTE,
  OPTIONS_ROUTES,
  getOptionsRouteMeta
} from "./config/routes"
import { useSettingsForm } from "./hooks/use-settings-form"
import { OptionsShell } from "./layout/OptionsShell"
import { GeneralSettingsPage } from "./pages/general/GeneralSettingsPage"
import { OverviewPage } from "./pages/overview/OverviewPage"
import { SitesPage } from "./pages/sites/SitesPage"

export type OptionsApi = {
  loadSettings: () => Promise<Settings>
  saveSettings: (settings: Settings) => Promise<Settings>
  testConnection: (settings: Settings) => Promise<TestQbConnectionResult>
}

type OptionsPageProps = {
  api: OptionsApi
}

function OptionsWorkspace({ api }: OptionsPageProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const activeMeta = useMemo(
    () => getOptionsRouteMeta(location.pathname),
    [location.pathname]
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
  } = useSettingsForm(api)

  return (
    <FormProvider {...form}>
      <OptionsShell
        routes={OPTIONS_ROUTES}
        activeMeta={activeMeta}
        activePath={activeMeta.path}
        onNavigate={navigate}
        status={status}
        saving={saving}
        onSubmit={handleSave}>
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
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="*" element={<Navigate to={DEFAULT_OPTIONS_ROUTE} replace />} />
        </Routes>
      </OptionsShell>
    </FormProvider>
  )
}

export function OptionsPage({ api }: OptionsPageProps) {
  return (
    <HashRouter>
      <OptionsWorkspace api={api} />
    </HashRouter>
  )
}
