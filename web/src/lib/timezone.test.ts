import { describe, expect, it } from 'vitest'
import { pickTimezone, timeZoneOptions } from './timezone'

const SERVER = ['Europe/Kyiv', 'Europe/Paris', 'UTC']

describe('pickTimezone', () => {
  it("uses the browser's zone when the server accepts it", () => {
    expect(pickTimezone('Europe/Paris', SERVER, 'UTC')).toBe('Europe/Paris')
  })

  it('keeps the current zone when the server does not know the browser zone', () => {
    expect(pickTimezone('Europe/Kiev', SERVER, 'UTC')).toBe('UTC')
  })

  it('keeps the current zone when the browser reports nothing', () => {
    expect(pickTimezone(undefined, SERVER, 'Europe/Paris')).toBe('Europe/Paris')
    expect(pickTimezone('', SERVER, 'Europe/Paris')).toBe('Europe/Paris')
  })
})

describe('timeZoneOptions', () => {
  it('lists the server zones sorted, without duplicates', () => {
    expect(timeZoneOptions(['Europe/Paris', 'Asia/Tokyo', 'UTC'], 'UTC')).toEqual([
      'Asia/Tokyo',
      'Europe/Paris',
      'UTC',
    ])
  })

  it('always includes UTC and the stored zone, even if the list is empty or lacks it', () => {
    expect(timeZoneOptions([], 'Mars/Base')).toEqual(['Mars/Base', 'UTC'])
  })
})
