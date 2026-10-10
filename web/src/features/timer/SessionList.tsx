import type { FocusSession, Tag } from '../../lib/types'
import { formatMinutes } from '../../lib/time'
import { ranFullLengthUnverified } from '../../lib/timer'
import { TagChip } from '../tags/TagChip'
import { useTags } from '../tags/queries'
import { useRecentSessions } from './queries'

export function sessionDateFormat(timezone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone })
  } catch {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  }
}

export function SessionRow({
  session: s,
  tag,
  format,
}: {
  session: FocusSession
  tag: Tag | undefined
  format: Intl.DateTimeFormat
}) {
  return (
    <li>
      <div className="session-main">
        <span className="session-when">{format.format(new Date(s.started_at))}</span>
        {tag ? <TagChip tag={tag} /> : null}
      </div>
      <span className="session-length">{formatMinutes(s.focused_seconds)}</span>
      <span className={s.status === 'completed' ? 'session-status' : 'session-status session-status--early'}>
        {s.status === 'completed' ? (
          'Completed'
        ) : ranFullLengthUnverified(s) ? (
          <span title="The timer ran out, but this page wasn't open for enough of it, so only the verified time was kept.">
            Not verified
          </span>
        ) : (
          'Ended early'
        )}
      </span>
      <span className="muted">
        {s.distraction_count} {s.distraction_count === 1 ? 'distraction' : 'distractions'}
      </span>
    </li>
  )
}

export function SessionList({ userId, timezone }: { userId: string; timezone: string }) {
  const recent = useRecentSessions(userId)
  const tags = useTags(userId)

  if (recent.isPending) return <p className="muted" aria-busy="true">Loading recent sessions…</p>
  if (recent.isError) return <p className="form-error" role="alert">Couldn't load recent sessions.</p>
  if (recent.data.length === 0) return <p className="muted">Finished sessions will show up here.</p>

  const format = sessionDateFormat(timezone)
  const tagById = new Map((tags.data ?? []).map((t) => [t.id, t]))

  return (
    <section className="stack" aria-labelledby="recent-heading">
      <h2 id="recent-heading">Recent sessions</h2>
      <ul className="session-list">
        {recent.data.map((s) => {
          const tag = s.tag_id ? tagById.get(s.tag_id) : undefined
          return <SessionRow key={s.id} session={s} tag={tag} format={format} />
        })}
      </ul>
    </section>
  )
}
