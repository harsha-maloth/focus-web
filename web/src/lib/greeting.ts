/** Hour of the day (0 to 23) in a time zone. Falls back to the device zone if the name is not valid. */
export function hourIn(timezone: string, date: Date): number {
  try {
    const h = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: timezone }).format(date)
    return Number.parseInt(h, 10) % 24
  } catch {
    return date.getHours()
  }
}

/** "Good morning", "Good afternoon", "Good evening" for an hour 0 to 23. Night hours read as evening. */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening'
}
