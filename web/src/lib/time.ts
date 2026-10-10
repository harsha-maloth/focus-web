function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** 65 -> "01:05", 3725 -> "1:02:05". Negative values show as zero. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/** Whole minutes for a list row; anything under a minute still reads as "<1 min". */
export function formatMinutes(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  return m < 1 ? '<1 min' : `${m} min`
}

/** 2700 -> "45 min", 3600 -> "1 h", 7500 -> "2 h 5 min". */
export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60)
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (h === 0) return `${m} min`
  return rem === 0 ? `${h} h` : `${h} h ${rem} min`
}

/** "2026-10-10" -> "10 Oct" in the viewer's language. Built from parts so no zone shift. */
export function shortDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
