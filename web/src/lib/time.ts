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
