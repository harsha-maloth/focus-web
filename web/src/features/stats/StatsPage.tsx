import { compareWeeks, milestoneLabel } from '../../lib/stats'
import { formatDuration, shortDay } from '../../lib/time'
import { useAuth } from '../auth/AuthProvider'
import { DailyChart } from './DailyChart'
import { useStats } from './queries'

export function StatsPage() {
  const { user } = useAuth()
  const userId = user!.id
  const stats = useStats(userId)

  if (stats.isPending) return <p className="muted" aria-busy="true">Loading your stats…</p>
  if (stats.isError) {
    return (
      <p className="form-error" role="alert">
        Couldn't load your stats. Check your connection and reload the page.
      </p>
    )
  }

  const s = stats.data

  if (s.total_sessions === 0) {
    return (
      <div className="page">
        <h1>Stats</h1>
        <p className="muted">Finish a session and your totals, streaks and charts will appear here.</p>
      </div>
    )
  }

  const tagTotal = s.tags.reduce((sum, t) => sum + t.seconds, 0)

  return (
    <div className="page">
      <h1>Stats</h1>

      <section className="stat-grid" aria-label="Summary">
        <div className="stat-card">
          <span className="stat-label">Today</span>
          <span className="stat-value">{formatDuration(s.today_seconds)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">This week</span>
          <span className="stat-value">{formatDuration(s.week_seconds)}</span>
          <span className="stat-note">{compareWeeks(s.week_seconds, s.last_week_seconds)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">This month</span>
          <span className="stat-value">{formatDuration(s.month_seconds)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Streak</span>
          <span className="stat-value">
            {s.current_streak} {s.current_streak === 1 ? 'day' : 'days'}
          </span>
          <span className="stat-note">
            {s.active_today || s.current_streak === 0
              ? `longest ${s.longest_streak}`
              : `finish a session today to keep it · longest ${s.longest_streak}`}
          </span>
        </div>
      </section>

      <section className="stack" aria-labelledby="daily-heading">
        <h2 id="daily-heading">Last 30 days</h2>
        <DailyChart data={s.daily} />
        <p className="hint">Days are counted in your time zone ({s.timezone}), by when a session started.</p>
      </section>

      <section className="stack" aria-labelledby="tags-stats-heading">
        <h2 id="tags-stats-heading">By tag</h2>
        {s.tags.length === 0 || tagTotal === 0 ? (
          <p className="muted">No sessions in the last 30 days.</p>
        ) : (
          <ul className="bar-list">
            {s.tags.map((t) => {
              const pct = Math.round((t.seconds / tagTotal) * 100)
              return (
                <li key={t.tag_id ?? 'none'}>
                  <div className="bar-head">
                    <span className="bar-name">
                      <span
                        className="tag-dot"
                        style={{ background: t.color ?? 'var(--muted)' }}
                        aria-hidden="true"
                      />
                      {t.name ?? 'No tag'}
                    </span>
                    <span className="bar-value">
                      {formatDuration(t.seconds)} · {pct}%
                    </span>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${pct}%`, background: t.color ?? 'var(--muted)' }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="stack" aria-labelledby="milestones-heading">
        <h2 id="milestones-heading">Milestones</h2>
        {s.milestones.length === 0 ? (
          <p className="muted">Your first milestone is one completed session away.</p>
        ) : (
          <ul className="milestone-list">
            {s.milestones.map((m) => (
              <li key={`${m.type}-${m.value}`}>
                <span className="milestone-name">{milestoneLabel(m.type, m.value)}</span>
                <span className="muted">{shortDay(m.achieved_at.slice(0, 10))}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="hint">
          {s.completed_sessions} completed {s.completed_sessions === 1 ? 'session' : 'sessions'},{' '}
          {formatDuration(s.total_seconds)} focused in total.
        </p>
      </section>
    </div>
  )
}
