import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export function RequireAuth() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <main className="centered" aria-busy="true">
        <p className="muted">Checking your session…</p>
      </main>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
