import { describe, expect, it } from 'vitest'
import { greetingFor, hourIn } from './greeting'

describe('greetingFor', () => {
  it('picks the part of the day', () => {
    expect(greetingFor(5)).toBe('Good morning')
    expect(greetingFor(11)).toBe('Good morning')
    expect(greetingFor(12)).toBe('Good afternoon')
    expect(greetingFor(16)).toBe('Good afternoon')
    expect(greetingFor(17)).toBe('Good evening')
    expect(greetingFor(0)).toBe('Good evening')
    expect(greetingFor(4)).toBe('Good evening')
  })
})

describe('hourIn', () => {
  it('reads the hour in the given zone', () => {
    const noonUtc = new Date('2026-10-10T12:00:00Z')
    expect(hourIn('UTC', noonUtc)).toBe(12)
    expect(hourIn('Asia/Calcutta', noonUtc)).toBe(17)
  })
  it('never returns 24', () => {
    expect(hourIn('UTC', new Date('2026-10-10T00:30:00Z'))).toBe(0)
  })
  it('falls back for a bad zone name', () => {
    const h = hourIn('Not/AZone', new Date('2026-10-10T12:00:00Z'))
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThan(24)
  })
})
