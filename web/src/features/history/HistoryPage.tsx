import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useProfile } from '../settings/queries'
import { useTags } from '../tags/queries'
import { SessionRow, sessionDateFormat } from '../timer/SessionList'
import { useHistory, type HistoryFilter } from './queries'

export function HistoryPage() {
  const { user } = useAuth()
  const userId = user!.id // RequireAuth guarantees a user here
  const profile = useProfile(userId)
  const tags = useTags(userId)
  const [filter, setFilter] = useState<HistoryFilter>({ tag: '', status: 'all' })
  const history = useHistory(userId, filter)

  const tagList = tags.data ?? []
  const tagById = new Map(tagList.map((t) => [t.id, t]))
  const format = sessionDateFormat(profile.data?.timezone ?? 'UTC')
  const sessions = history.data?.pages.flat() ?? []

  return (
    <div className="page">
      <h1>History</h1>
      <div className="filters">
        <div className="field">
          <label htmlFor="history-status">Show</label>
          <select
            id="history-status"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value as HistoryFilter['status'] })}
          >
            <option value="all">All sessions</option>
            <option value="completed">Completed</option>
            <option value="abandoned">Ended early or not verified</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="history-tag">Tag</label>
          <select id="history-tag" value={filter.tag} onChange={(e) => setFilter({ ...filter, tag: e.target.value })}>
            <option value="">All tags</option>
            <option value="none">No tag</option>
            {tagList.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {history.isPending ? <p className="muted" aria-busy="true">Loading sessions…</p> : null}
      {history.isError ? (
        <p className="form-error" role="alert">Couldn't load your history. Check your connection and reload.</p>
      ) : null}
      {history.isSuccess && sessions.length === 0 ? (
        <p className="muted">
          {filter.tag || filter.status !== 'all'
            ? 'No sessions match these filters.'
            : 'Finished sessions will show up here. Start one from Home.'}
        </p>
      ) : null}
      {sessions.length > 0 ? (
        <ul className="session-list">
          {sessions.map((s) => (
            <SessionRow key={s.id} session={s} tag={s.tag_id ? tagById.get(s.tag_id) : undefined} format={format} />
          ))}
        </ul>
      ) : null}
      {history.hasNextPage ? (
        <div className="actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => void history.fetchNextPage()}
            disabled={history.isFetchingNextPage}
          >
            {history.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
