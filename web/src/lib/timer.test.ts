import { describe, expect, it } from 'vitest'
import { HEARTBEAT_MS, STALE_GRACE_MS, isStale, secondsRemaining } from './timer'

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
