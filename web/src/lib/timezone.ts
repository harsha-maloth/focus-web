/** Time zones the browser knows about. Only a fallback: the server's list is the one that matters. */
export function browserTimeZones(): string[] {
  return typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
}

/**
 * The zone to store for a new account. The browser's zone is used only if the
 * server accepts it; otherwise the current one stays, and the person can pick
 * from the server's list in Settings.
 */
export function pickTimezone(
  browserZone: string | undefined,
  serverZones: string[],
  current: string,
): string {
  return browserZone && serverZones.includes(browserZone) ? browserZone : current
}

/** Options for the time zone picker: everything the server accepts, plus UTC and the current value. */
export function timeZoneOptions(serverZones: string[], current: string): string[] {
  return [...new Set([...serverZones, 'UTC', current])].sort()
}
