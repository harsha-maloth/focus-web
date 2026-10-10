import { useState } from 'react'
import { SkeletonRows } from '../../components/Skeleton'
import { useAuth } from '../auth/AuthProvider'
import { useProfile } from '../settings/queries'
import { useTags } from '../tags/queries'
import { SessionRow, sessionDateFormat } from '../timer/SessionList'
import { useHistory, type HistoryFilter } from './queries'

const STATUS_CHIPS: { value: HistoryFilter['status']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  // Stored as "abandoned": ended early, or the timer ran out but presence wasn't verified.
  { value: 'abandoned', label: 'Ended early / not verified' },
]

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
      <h1 className="page-title">History</h1>
      <div className="filters">
        <div className="field">
          <span id="history-status-label" className="field-label">
            Show
          </span>
          <div className="chips" role="group" aria-labelledby="history-status-label">
            {STATUS_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                className="chip"
                aria-pressed={filter.status === chip.value}
                onClick={() => setFilter({ ...filter, status: chip.value })}
              >
                {chip.label}
              </button>
            ))}
          </div>
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

      {history.isPending ? <SkeletonRows count={5} label="Loading sessions" /> : null}
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
