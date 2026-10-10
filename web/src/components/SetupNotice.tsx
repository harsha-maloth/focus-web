export function SetupNotice() {
  return (
    <main className="centered">
      <div className="notice stack">
        <h1>Connect Supabase</h1>
        <p>
          This build has no Supabase settings. Add these two values and restart the dev server (or rebuild):
        </p>
        <pre>
          VITE_SUPABASE_URL{'\n'}VITE_SUPABASE_ANON_KEY
        </pre>
        <p className="muted">
          Locally, put them in <code>web/.env.local</code>. On GitHub, add them as repository variables under
          Settings, Secrets and variables, Actions.
        </p>
      </div>
    </main>
  )
}
