/** A session left running this long past its planned end no longer counts as live (see start_session). */
export const STALE_GRACE_MS = 300_000

/** How often the open page tells the server someone is there. The server accepts gaps up to 90 s. */
export const HEARTBEAT_MS = 30_000

/** Whole seconds left, rounded up so the clock shows 00:01 until the last moment. Negative once past the end. */
export function secondsRemaining(startedAtMs: number, plannedSeconds: number, nowMs: number): number {
  return Math.ceil((startedAtMs + plannedSeconds * 1000 - nowMs) / 1000)
}

/** True once a session has run so far past its end that starting a new one will close it out. */
export function isStale(startedAtMs: number, plannedSeconds: number, nowMs: number): boolean {
  return nowMs > startedAtMs + plannedSeconds * 1000 + STALE_GRACE_MS
}
