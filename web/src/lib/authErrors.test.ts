import { describe, expect, it } from 'vitest'
import { parseAuthError } from './authErrors'

describe('parseAuthError', () => {
  it('returns null for normal routes and empty URLs', () => {
    expect(parseAuthError('', '')).toBeNull()
    expect(parseAuthError('', '#/login')).toBeNull()
    expect(parseAuthError('?code=abc', '#/settings')).toBeNull()
  })

  it('explains an expired email link', () => {
    const hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid'
    expect(parseAuthError('', hash)).toMatch(/expired or was already used/)
  })

  it('passes through other provider errors', () => {
    const search = '?error=server_error&error_description=Unable+to+exchange+external+code'
    expect(parseAuthError(search, '')).toBe('Unable to exchange external code')
  })

  it('falls back to a generic message', () => {
    expect(parseAuthError('', '#error=access_denied')).toBe('Sign-in failed. Try again.')
  })
})
