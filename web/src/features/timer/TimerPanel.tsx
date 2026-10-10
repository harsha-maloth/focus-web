import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Ring } from '../../components/Ring'
import { formatClock, formatMinutes } from '../../lib/time'
import type { FocusSession } from '../../lib/types'
import {
  rpcEndSession,
  rpcLogEvent,
  rpcStartSession,
  useRunningSession,
  useServerOffset,
} from './queries'
import { useNow } from './useNow'

/** A session left running this long past its planned end no longer counts (see start_session). */
const STALE_GRACE_MS = 300_000

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const messageOf = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback)

export function TimerPanel({ userId, defaultMinutes }: { userId: string; defaultMinutes: number }) {
  const queryClient = useQueryClient()
  const running = useRunningSession(userId)
  const offset = useServerOffset()
  const session = running.data ?? null

  const [minutes, setMinutes] = useState(String(defaultMinutes))
  const [result, setResult] = useState<FocusSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmingGiveUp, setConfirmingGiveUp] = useState(false)
  const completing = useRef<string | null>(null)

  const now = useNow(offset.data ?? 0, session !== null)
  const startMs = session ? new Date(session.started_at).getTime() : 0
  const remaining = session ? Math.ceil((startMs + session.planned_seconds * 1000 - now) / 1000) : 0
  const due = session !== null && remaining <= 0
  const stale = session !== null && now > startMs + session.planned_seconds * 1000 + STALE_GRACE_MS

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['running-session', userId] })
    void queryClient.invalidateQueries({ queryKey: ['recent-sessions', userId] })
  }

  // The server only accepts "completed" once the planned time has really passed
  // (2 s tolerance), so retry briefly if our clock estimate was a touch early.
  async function complete(target: FocusSession) {
    completing.current = target.id
    setError(null)
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const row = await rpcEndSession(target.id, 'completed')
        setResult(row)
        refresh()
        return
      } catch (err) {
        const message = messageOf(err, 'Could not finish the session.')
        if (!message.includes('not reached')) {
          setError(message)
          completing.current = null
          return
        }
        await sleep(1500)
      }
    }
    setError('Could not finish the session. Check your connection and try again.')
    completing.current = null
  }

  // Finish automatically when the countdown reaches zero.
  useEffect(() => {
    if (!session || !due || stale || completing.current === session.id) return
    void complete(session)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, due, stale])

  // Leaving the tab is a distraction. Log it once on the way out and once on the way back.
  useEffect(() => {
    if (!session) return
    const id = session.id
    let hidden = document.visibilityState === 'hidden'
    function onChange() {
      const nowHidden = document.visibilityState === 'hidden'
      if (nowHidden === hidden) return
      hidden = nowHidden
      rpcLogEvent(id, nowHidden ? 'blur' : 'focus')
        .then(() => {
          if (!nowHidden) refresh()
        })
        .catch(() => {
          // Session already ended or offline: nothing to do.
        })
    }
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  // Show the countdown in the browser tab.
  useEffect(() => {
    if (!session || due) return
    document.title = `${formatClock(remaining)} · Focus`
    return () => {
      document.title = 'Focus'
    }
  }, [session, due, remaining])

  const minutesNumber = Number(minutes)
  const minutesValid = Number.isInteger(minutesNumber) && minutesNumber >= 1 && minutesNumber <= 240

  async function onStart() {
    if (!minutesValid) return
    setBusy(true)
    setError(null)
    setResult(null)
    completing.current = null
    try {
      await rpcStartSession(minutesNumber * 60)
    } catch (err) {
      setError(messageOf(err, 'Could not start the session.'))
    }
    refresh()
    setBusy(false)
  }

  async function onGiveUp() {
    if (!session) return
    setBusy(true)
    setError(null)
    try {
      const row = await rpcEndSession(session.id, 'abandoned')
      setConfirmingGiveUp(false)
      setResult(row)
    } catch (err) {
      setError(messageOf(err, 'Could not end the session.'))
    }
    refresh()
    setBusy(false)
  }

  if (running.isPending || offset.isPending) {
    return <p className="muted" aria-busy="true">Loading your timer…</p>
  }
  if (running.isError) {
    return (
      <p className="form-error" role="alert">
        Couldn't load your timer. Check your connection and reload the page.
      </p>
    )
  }

  // A session left running far past its end. Starting a new one closes it without credit.
  if (session && stale) {
    return (
      <div className="home">
        <div className="home-copy">
          <h2>Last session was left running</h2>
          <p className="muted">
            It ran past its planned end with no sign you were there, so it won't count toward your totals.
          </p>
          <div className="actions">
            <label className="timer-minutes">
              <span>Minutes</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={240}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                aria-invalid={!minutesValid}
              />
            </label>
            <button type="button" className="btn btn-primary" onClick={onStart} disabled={busy || !minutesValid}>
              Start a new session
            </button>
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </div>
        <Ring className="home-ring" progress={0}>
          <span className="ring-time">--:--</span>
          <span className="ring-caption">not counted</span>
        </Ring>
      </div>
    )
  }

  if (session) {
    return (
      <div className="home">
        <div className="home-copy">
          <h2>{due ? 'Wrapping up…' : 'Focus'}</h2>
          <p className="muted">
            {session.distraction_count === 0
              ? 'No distractions so far. Leaving this tab counts as one.'
              : `${session.distraction_count} ${session.distraction_count === 1 ? 'distraction' : 'distractions'} so far.`}
          </p>
          {error ? (
            <div className="stack">
              <p className="form-error" role="alert">{error}</p>
              <div className="actions">
                <button type="button" className="btn btn-primary" onClick={() => void complete(session)}>
                  Try again
                </button>
              </div>
            </div>
          ) : null}
          {!due ? (
            confirmingGiveUp ? (
              <div className="actions">
                <button type="button" className="btn btn-danger" onClick={onGiveUp} disabled={busy}>
                  End session
                </button>
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={() => setConfirmingGiveUp(false)}
                  disabled={busy}
                >
                  Keep going
                </button>
              </div>
            ) : (
              <div className="actions">
                <button type="button" className="btn btn-outline" onClick={() => setConfirmingGiveUp(true)}>
                  Give up
                </button>
              </div>
            )
          ) : null}
        </div>
        <Ring className="home-ring" progress={Math.max(0, remaining) / session.planned_seconds}>
          <span className="ring-time">{formatClock(remaining)}</span>
          <span className="ring-caption">remaining</span>
        </Ring>
      </div>
    )
  }

  const idleMinutes = minutesValid ? minutesNumber : defaultMinutes

  return (
    <div className="home">
      <div className="home-copy">
        {result ? (
          <>
            <h2>{result.status === 'completed' ? 'Session complete' : 'Session ended early'}</h2>
            <p className="muted">
              {formatMinutes(result.focused_seconds)} focused
              {result.distraction_count > 0
                ? `, ${result.distraction_count} ${result.distraction_count === 1 ? 'distraction' : 'distractions'}`
                : ', no distractions'}
              . Timed by the server.
            </p>
          </>
        ) : (
          <>
            <h2>Ready when you are</h2>
            <p className="muted">Sessions are timed on the server, so the totals you see are the totals you earned.</p>
          </>
        )}
        <div className="actions">
          <label className="timer-minutes">
            <span>Minutes</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={240}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              aria-invalid={!minutesValid}
            />
          </label>
          <button type="button" className="btn btn-primary" onClick={onStart} disabled={busy || !minutesValid}>
            {result ? 'Start another' : 'Start focus'}
          </button>
        </div>
        {!minutesValid ? (
          <p className="form-error" role="alert">Choose 1–240 minutes.</p>
        ) : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </div>
      <Ring className="home-ring" progress={1}>
        <span className="ring-time">{formatClock(idleMinutes * 60)}</span>
        <span className="ring-caption">{result ? 'done' : 'ready'}</span>
      </Ring>
    </div>
  )
}
