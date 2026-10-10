import { Ring } from '../../components/Ring'
import { useAuth } from '../auth/AuthProvider'
import { useProfile, useSettings } from '../settings/queries'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export function HomePage() {
  const { user } = useAuth()
  const userId = user!.id
  const profile = useProfile(userId)
  const settings = useSettings(userId)

  const name = profile.data?.display_name?.trim()
  const focusMinutes = settings.data?.default_minutes ?? 25
  const breakMinutes = settings.data?.break_minutes ?? 5

  return (
    <div className="page home">
      <div className="home-copy">
        <h1>{name ? `Welcome, ${name}` : 'Welcome'}</h1>
        <p>
          Your sessions will be timed on the server, so the totals you see are the totals you earned.
        </p>
        <p className="muted">
          The timer isn't built yet. Your defaults are saved and will be used when it is: {focusMinutes} minutes of
          focus, {breakMinutes} minutes of break.
        </p>
      </div>

      <Ring className="home-ring" progress={1}>
        <span className="ring-time">{pad(focusMinutes)}:00</span>
        <span className="ring-caption">default session</span>
      </Ring>
    </div>
  )
}
