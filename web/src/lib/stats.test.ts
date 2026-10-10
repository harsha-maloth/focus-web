import { describe, expect, it } from 'vitest'
import { compareWeeks, milestoneLabel } from './stats'
import { formatDuration } from './time'

describe('compareWeeks', () => {
  it('describes growth and decline', () => {
    expect(compareWeeks(1500, 1000)).toBe('up 50% on last week')
    expect(compareWeeks(500, 1000)).toBe('down 50% on last week')
  })

  it('handles equal and empty weeks', () => {
    expect(compareWeeks(1000, 1000)).toBe('same as last week')
    expect(compareWeeks(100, 0)).toBe('nothing recorded last week')
    expect(compareWeeks(0, 0)).toBe('no focus time yet this week or last')
  })
})

describe('milestoneLabel', () => {
  it('words each milestone type', () => {
    expect(milestoneLabel('sessions', 1)).toBe('First session completed')
    expect(milestoneLabel('sessions', 10)).toBe('10 sessions completed')
    expect(milestoneLabel('hours', 1)).toBe('1 hour focused')
    expect(milestoneLabel('hours', 10)).toBe('10 hours focused')
    expect(milestoneLabel('streak', 7)).toBe('7-day streak')
  })
})

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(2700)).toBe('45 min')
    expect(formatDuration(3600)).toBe('1 h')
    expect(formatDuration(7500)).toBe('2 h 5 min')
  })
})
