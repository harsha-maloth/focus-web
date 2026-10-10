import { useEffect, useState } from 'react'

/** Server-adjusted "now" in ms, ticking while `active`. */
export function useNow(offsetMs: number, active: boolean): number {
  const [now, setNow] = useState(() => Date.now() + offsetMs)

  useEffect(() => {
    if (!active) return
    setNow(Date.now() + offsetMs)
    const id = window.setInterval(() => setNow(Date.now() + offsetMs), 250)
    return () => window.clearInterval(id)
  }, [offsetMs, active])

  return now
}
