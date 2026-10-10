import { formatMinutes } from '../../lib/time'
import { useRecentSessions } from './queries'

export function SessionList({ userId, timezone }: { userId: string; timezone: string }) {
  const recent = useRecentSessions(userId)

  if (recent.isPending) return <p className="muted" aria-busy="true">Loading recent sessions…</p>
  if (recent.isError) return <p className="form-error" role="alert">Couldn't load recent sessions.</p>
  if (recent.data.length === 0) return <p className="muted">Finished sessions will show up here.</p>

  let format: Intl.DateTimeFormat
  try {
    format = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone })
  } catch {
    format = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }

  return (
    <section className="stack" aria-labelledby="recent-heading">
      <h2 id="recent-heading">Recent sessions</h2>
      <ul className="session-list">
        {recent.data.map((s) => (
          <li key={s.id}>
            <span className="session-when">{format.format(new Date(s.started_at))}</span>
            <span className="session-length">{formatMinutes(s.focused_seconds)}</span>
            <span className={s.status === 'completed' ? 'session-status' : 'session-status session-status--early'}>
              {s.status === 'completed' ? 'Completed' : 'Ended early'}
            </span>
            <span className="muted">
              {s.distraction_count} {s.distraction_count === 1 ? 'distraction' : 'distractions'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
