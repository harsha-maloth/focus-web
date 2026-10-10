import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { useProfile, useSaveProfile } from '../features/settings/queries'

export function Shell() {
  const { user, signOut } = useAuth()
  const userId = user!.id
  const profile = useProfile(userId)
  const saveProfile = useSaveProfile(userId)

  // New accounts start on UTC. Set the browser's zone once so daily totals line up.
  const { data, isSuccess } = profile
  const { mutate } = saveProfile
  useEffect(() => {
    if (!isSuccess || data.timezone !== 'UTC') return
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (browserZone && browserZone !== 'UTC') {
      mutate({ display_name: data.display_name, timezone: browserZone })
    }
  }, [isSuccess, data, mutate])

  return (
    <div className="shell">
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="Focus home">
          <span className="brand-mark" aria-hidden="true" />
          focus
        </NavLink>
        <nav aria-label="Main">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <button type="button" className="btn btn-quiet" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
