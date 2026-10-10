import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

type Tone = 'info' | 'success' | 'error'
type Show = (message: string, tone?: Tone) => void

const SnackbarContext = createContext<Show>(() => {})

const DISMISS_MS = 5000

/** Short messages that confirm an action ("Settings saved"). One at a time; a new one replaces the old. */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [item, setItem] = useState<{ id: number; message: string; tone: Tone } | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const dismiss = useCallback(() => {
    window.clearTimeout(timer.current)
    setItem(null)
  }, [])

  const show = useCallback<Show>((message, tone = 'info') => {
    window.clearTimeout(timer.current)
    setItem({ id: Date.now(), message, tone })
    timer.current = window.setTimeout(() => setItem(null), DISMISS_MS)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <SnackbarContext.Provider value={show}>
      {children}
      <div className="snackbar-region" role="status" aria-live="polite">
        {item ? (
          <div key={item.id} className={`snackbar snackbar--${item.tone}`}>
            <span>{item.message}</span>
            <button type="button" className="snackbar-close" onClick={dismiss}>
              Dismiss
            </button>
          </div>
        ) : null}
      </div>
    </SnackbarContext.Provider>
  )
}

export function useSnackbar(): Show {
  return useContext(SnackbarContext)
}
