import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { useInstallPrompt } from '../features/pwa/useInstallPrompt'
import { useProfile, useSaveProfile, useTimeZones } from '../features/settings/queries'
import { greetingFor, hourIn } from '../lib/greeting'
import { pickTimezone } from '../lib/timezone'
import { HistoryIcon, HomeIcon, SettingsIcon, StatsIcon } from './icons'

const TITLES: Record<string, string> = { '/history': 'History', '/stats': 'Stats', '/settings': 'Settings' }

export function Shell() {
  const { pathname } = useLocation()
  const { user, signOut } = useAuth()
  const userId = user!.id
  const profile = useProfile(userId)
  const saveProfile = useSaveProfile(userId)
  const { canInstall, install } = useInstallPrompt()

  // New accounts start on UTC, unconfirmed. Set the browser's zone once, then mark
  // it confirmed so a later deliberate choice (even UTC) is never overwritten.
  // The zone is used only if the server accepts it; otherwise the account stays on
  // UTC and Settings offers the server's list (Stats says which zone is in use).
  const zones = useTimeZones()
  const { data, isSuccess } = profile
  const { mutate } = saveProfile
  const zonesReady = zones.isSuccess
  const zoneList = zones.data
  useEffect(() => {
    if (!isSuccess || !zonesReady || data.timezone_confirmed) return
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    mutate({
      display_name: data.display_name,
      timezone: pickTimezone(browserZone, zoneList ?? [], data.timezone),
      timezone_confirmed: true,
    })
  }, [isSuccess, zonesReady, zoneList, data, mutate])

  return (
    <div className="shell">
      <header className="appbar">
        <div className="appbar-row">
        <NavLink to="/" className="brand" aria-label="Focus home">
          <span className="brand-mark" aria-hidden="true" />
          focus
        </NavLink>
        <div className="appbar-actions">
          {canInstall ? (
            <button type="button" className="btn btn-outline" onClick={() => void install()}>
              Install
            </button>
          ) : null}
          <button type="button" className="btn btn-quiet" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
        </div>
        {/* The page's own h1 carries the same text for screen readers (hidden on phones). */}
        <p className="appbar-title" aria-hidden="true">
          {pathname === '/' ? (
            <>
              <span className="appbar-sub">{greetingFor(hourIn(profile.data?.timezone ?? 'UTC', new Date()))},</span>
              {profile.data?.display_name?.trim() || 'there'}
            </>
          ) : (
            (TITLES[pathname] ?? 'Focus')
          )}
        </p>
      </header>
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="Focus home">
          <span className="brand-mark" aria-hidden="true" />
          focus
        </NavLink>
        <nav aria-label="Main">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/history">History</NavLink>
          <NavLink to="/stats">Stats</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        {canInstall ? (
          <button type="button" className="btn btn-outline" onClick={() => void install()}>
            Install app
          </button>
        ) : null}
        <button type="button" className="btn btn-quiet" onClick={() => void signOut()}>
          Sign out
        </button>
      </header>
      <main className="content">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Main">
        <NavLink to="/" end>
          <HomeIcon />
          Home
        </NavLink>
        <NavLink to="/history">
          <HistoryIcon />
          History
        </NavLink>
        <NavLink to="/stats">
          <StatsIcon />
          Stats
        </NavLink>
        <NavLink to="/settings">
          <SettingsIcon />
          Settings
        </NavLink>
      </nav>
    </div>
  )
}
