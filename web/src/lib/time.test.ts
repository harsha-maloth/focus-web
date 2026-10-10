import { describe, expect, it } from 'vitest'
import { formatClock, formatMinutes, shortDate } from './time'

describe('formatClock', () => {
  it('formats minutes and seconds', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(65)).toBe('01:05')
    expect(formatClock(1500)).toBe('25:00')
  })

  it('adds hours past one hour', () => {
    expect(formatClock(3725)).toBe('1:02:05')
  })

  it('never goes negative', () => {
    expect(formatClock(-3)).toBe('00:00')
  })
})

describe('formatMinutes', () => {
  it('rounds down to whole minutes', () => {
    expect(formatMinutes(125)).toBe('2 min')
  })

  it('shows short sessions as under a minute', () => {
    expect(formatMinutes(20)).toBe('<1 min')
  })
})

describe('shortDate', () => {
  // 23:30 UTC on 10 Oct is already the 11th in Tokyo and still the 10th in Honolulu.
  const instant = '2026-10-10T23:30:00Z'

  it('puts the instant on the right day for the given time zone', () => {
    expect(shortDate(instant, 'Asia/Tokyo')).toMatch(/\b11\b/)
    expect(shortDate(instant, 'Pacific/Honolulu')).toMatch(/\b10\b/)
  })

  it('does not throw on a time zone name it does not know', () => {
    expect(shortDate(instant, 'Mars/Base').length).toBeGreaterThan(0)
  })
})
