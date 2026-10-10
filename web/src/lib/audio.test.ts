import { describe, expect, it } from 'vitest'
import { normalizeSound, readAmbient } from './audio'

describe('normalizeSound', () => {
  it('keeps known sounds', () => {
    expect(normalizeSound('chime')).toBe('chime')
    expect(normalizeSound('bell')).toBe('bell')
  })
  it('treats anything else as silent', () => {
    expect(normalizeSound('rain')).toBe('none')
    expect(normalizeSound(undefined)).toBe('none')
    expect(normalizeSound(42)).toBe('none')
  })
})

describe('readAmbient', () => {
  it('reads the ambient choice from the zen settings', () => {
    expect(readAmbient({ ambient: 'brown' })).toBe('brown')
    expect(readAmbient({ ambient: 'white', other: 1 })).toBe('white')
  })
  it('defaults to off for missing or unknown values', () => {
    expect(readAmbient({})).toBe('off')
    expect(readAmbient({ ambient: 'ocean' })).toBe('off')
    expect(readAmbient(null)).toBe('off')
    expect(readAmbient('brown')).toBe('off')
  })
})
