import { describe, expect, it } from 'vitest'
import {
  HEARTBEAT_MS,
  STALE_GRACE_MS,
  isNotReachedError,
  isStale,
  ranFullLengthUnverified,
  secondsRemaining,
} from './timer'

const START = 1_000_000_000_000

describe('secondsRemaining', () => {
  it('counts down from the planned length', () => {
    expect(secondsRemaining(START, 1500, START)).toBe(1500)
    expect(secondsRemaining(START, 1500, START + 60_000)).toBe(1440)
  })

  it('rounds up so the clock never shows zero early', () => {
    expect(secondsRemaining(START, 60, START + 59_500)).toBe(1)
    expect(secondsRemaining(START, 60, START + 60_000)).toBe(0)
  })

  it('goes negative once the session is over', () => {
    expect(secondsRemaining(START, 60, START + 90_000)).toBe(-30)
  })
})

describe('isStale', () => {
  it('is false until the grace period after the planned end has passed', () => {
    const end = START + 600 * 1000
    expect(isStale(START, 600, end)).toBe(false)
    expect(isStale(START, 600, end + STALE_GRACE_MS)).toBe(false)
    expect(isStale(START, 600, end + STALE_GRACE_MS + 1)).toBe(true)
  })
})

describe('heartbeat', () => {
  it('beats well inside the 90 s the server tolerates', () => {
    expect(HEARTBEAT_MS).toBeLessThan(90_000 / 2)
  })
})

describe('isNotReachedError', () => {
  it('matches the SQLSTATE, not the wording', () => {
    expect(isNotReachedError(Object.assign(new Error('reworded'), { code: '22023' }))).toBe(true)
    expect(isNotReachedError(new Error('session has not reached its planned length'))).toBe(false)
    expect(isNotReachedError(null)).toBe(false)
  })
})

describe('ranFullLengthUnverified', () => {
  const base = { started_at: '2026-10-10T10:00:00Z', planned_seconds: 600 }
  it('is true when abandoned at the planned end', () => {
    expect(ranFullLengthUnverified({ ...base, status: 'abandoned', ended_at: '2026-10-10T10:10:00Z' })).toBe(true)
  })
  it('is false when given up early or completed', () => {
    expect(ranFullLengthUnverified({ ...base, status: 'abandoned', ended_at: '2026-10-10T10:03:00Z' })).toBe(false)
    expect(ranFullLengthUnverified({ ...base, status: 'completed', ended_at: '2026-10-10T10:10:00Z' })).toBe(false)
  })
})
