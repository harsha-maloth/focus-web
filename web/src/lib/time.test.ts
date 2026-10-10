import { describe, expect, it } from 'vitest'
import { formatClock, formatMinutes } from './time'

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
