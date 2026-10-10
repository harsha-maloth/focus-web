import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Ring } from '../../components/Ring'
import { getStartupAuthError } from '../../lib/authErrors'
import { authRedirectUrl, supabase } from '../../lib/supabase'
import { useAuth } from './AuthProvider'

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; email: string }
  | { kind: 'error'; message: string }

/** The login screen has no coloured header, so match the browser bar to the page while it is open. */
function usePageThemeColor() {
  useEffect(() => {
    const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'))
    const saved = metas.map((m) => m.content)
    for (const m of metas) m.content = (m.media || '').includes('dark') ? '#0c1519' : '#e4ece9'
    return () => metas.forEach((m, i) => (m.content = saved[i]))
  }, [])
}

export function LoginPage() {
  usePageThemeColor()
  const { session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>(() => {
    const message = getStartupAuthError()
    return message ? { kind: 'error', message } : { kind: 'idle' }
  })

  if (!loading && session) return <Navigate to="/" replace />

  const busy = status.kind === 'sending'

  async function sendLink(event: FormEvent) {
    event.preventDefault()
    const address = email.trim()
    if (!address) return
    setStatus({ kind: 'sending' })
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: authRedirectUrl(), shouldCreateUser: true },
    })
    setStatus(
      error
        ? { kind: 'error', message: error.message }
        : { kind: 'sent', email: address },
    )
  }

  async function signInWithGoogle() {
    setStatus({ kind: 'sending' })
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: authRedirectUrl() },
    })
    // On success the browser leaves for Google, so only errors come back here.
    if (error) setStatus({ kind: 'error', message: error.message })
  }

  return (
    <main className="login">
      <section className="login-art" aria-label="Focus">
        <Ring className="login-ring" progress={0.72} drawIn>
          <span className="login-wordmark">focus</span>
        </Ring>
        <p className="login-tagline">A focus timer that keeps honest time.</p>
      </section>

      <section className="login-panel">
        <h1>Sign in</h1>

        {status.kind === 'sent' ? (
          <div className="sent" role="status">
            <p>
              We sent a sign-in link to <strong>{status.email}</strong>.
            </p>
            <p className="muted">
              Open it in this browser. The link only works where you asked for it.
            </p>
            <button type="button" className="btn btn-quiet" onClick={() => setStatus({ kind: 'idle' })}>
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={sendLink} className="stack">
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={busy}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy || !email.trim()}>
                {busy ? 'Sending…' : 'Email me a sign-in link'}
              </button>
            </form>

            <p className="divider-text muted">or</p>

            <button type="button" className="btn btn-outline" onClick={signInWithGoogle} disabled={busy}>
              Continue with Google
            </button>
          </>
        )}

        {status.kind === 'error' ? (
          <p className="form-error" role="alert">
            {status.message}
          </p>
        ) : null}
      </section>
    </main>
  )
}
