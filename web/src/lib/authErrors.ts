/**
 * Supabase reports failed email links by redirecting with
 * `#error=...&error_code=...&error_description=...` (or the same in the query).
 * Turn that into a message people can act on.
 */
export function parseAuthError(search: string, hash: string): string | null {
  for (const raw of [search, hash]) {
    const params = new URLSearchParams(raw.replace(/^[?#]/, ''))
    if (!params.has('error') && !params.has('error_description')) continue
    if (params.get('error_code') === 'otp_expired') {
      return 'That sign-in link has expired or was already used. Request a new one.'
    }
    return params.get('error_description') ?? 'Sign-in failed. Try again.'
  }
  return null
}

let startupError: string | null = null

/**
 * Call once before the app renders. Reads an auth error from the URL, then
 * resets the URL so the hash router does not treat it as a route.
 */
export function captureStartupAuthError(): void {
  startupError = parseAuthError(window.location.search, window.location.hash)
  if (startupError) {
    window.history.replaceState(null, '', `${import.meta.env.BASE_URL}#/login`)
  }
}

export function getStartupAuthError(): string | null {
  return startupError
}
