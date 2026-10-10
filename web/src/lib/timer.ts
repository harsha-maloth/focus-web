/** A session left running this long past its planned end no longer counts as live (see start_session). */
export const STALE_GRACE_MS = 300_000

/** How often the open page tells the server someone is there. The server accepts gaps up to 90 s. */
export const HEARTBEAT_MS = 30_000

/** SQLSTATE end_session raises when "completed" is asked for before the planned length (22023). */
export const NOT_REACHED_CODE = '22023'

/** True for the "planned length not reached yet" refusal. Matches the SQLSTATE, not the message text. */
export function isNotReachedError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === NOT_REACHED_CODE
}

/**
 * A session stored as abandoned although it ran to its planned end: the timer finished
 * but the server could not verify enough presence. Different from giving up.
 */
export function ranFullLengthUnverified(s: {
  status: string
  started_at: string
  planned_seconds: number
  ended_at: string | null
}): boolean {
  if (s.status !== 'abandoned' || !s.ended_at) return false
  return new Date(s.ended_at).getTime() >= new Date(s.started_at).getTime() + (s.planned_seconds - 2) * 1000
}

/** Whole seconds left, rounded up so the clock shows 00:01 until the last moment. Negative once past the end. */
export function secondsRemaining(startedAtMs: number, plannedSeconds: number, nowMs: number): number {
  return Math.ceil((startedAtMs + plannedSeconds * 1000 - nowMs) / 1000)
}

/** True once a session has run so far past its end that starting a new one will close it out. */
export function isStale(startedAtMs: number, plannedSeconds: number, nowMs: number): boolean {
  return nowMs > startedAtMs + plannedSeconds * 1000 + STALE_GRACE_MS
}
