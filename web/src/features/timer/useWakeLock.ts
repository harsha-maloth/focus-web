import { useEffect } from 'react'

/** Keeps the screen on while `active`. Browsers drop the lock when the tab is hidden, so it is re-taken on return. */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false

    async function acquire() {
      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          sentinel.release().catch(() => {})
          return
        }
        lock = sentinel
      } catch {
        // Denied (battery saver, unsupported): the screen may sleep, nothing else changes.
      }
    }

    function onVisible() {
      if (document.visibilityState === 'visible' && (!lock || lock.released)) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [active])
}
