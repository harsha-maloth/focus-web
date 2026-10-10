import { Link } from 'react-router-dom'
import { normalizeSound, readAmbient } from '../../lib/audio'
import { SessionList } from '../timer/SessionList'
import { TimerPanel } from '../timer/TimerPanel'
import { useAuth } from '../auth/AuthProvider'
import { useProfile, useSettings } from '../settings/queries'

export function HomePage() {
  const { user } = useAuth()
  const userId = user!.id
  const profile = useProfile(userId)
  const settings = useSettings(userId)

  const name = profile.data?.display_name?.trim()
  const focusMinutes = settings.data?.default_minutes ?? 25
  const breakMinutes = settings.data?.break_minutes ?? 5

  if (settings.isPending) {
    return <p className="muted" aria-busy="true">Loading…</p>
  }

  return (
    <div className="page">
      <h1>{name ? `Welcome, ${name}` : 'Welcome'}</h1>
      <TimerPanel
        key={`${focusMinutes}-${breakMinutes}`}
        userId={userId}
        defaultMinutes={focusMinutes}
        breakMinutes={breakMinutes}
        sound={normalizeSound(settings.data?.sound)}
        ambient={readAmbient(settings.data?.zen)}
      />
      <SessionList userId={userId} timezone={profile.data?.timezone ?? 'UTC'} />
      <p>
        <Link to="/history">See all sessions</Link>
      </p>
    </div>
  )
}
