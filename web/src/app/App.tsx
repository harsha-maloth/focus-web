import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { SetupNotice } from '../components/SetupNotice'
import { Shell } from '../components/Shell'
import { AuthProvider } from '../features/auth/AuthProvider'
import { LoginPage } from '../features/auth/LoginPage'
import { RequireAuth } from '../features/auth/RequireAuth'
import { HistoryPage } from '../features/history/HistoryPage'
import { HomePage } from '../features/home/HomePage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { StatsPage } from '../features/stats/StatsPage'
import { isConfigured } from '../lib/supabase'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

export function App() {
  if (!isConfigured) return <SetupNotice />

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Hash routing: GitHub Pages has no server-side rewrites. */}
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<RequireAuth />}>
              <Route element={<Shell />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/stats" element={<StatsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
