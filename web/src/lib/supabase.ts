import { createClient } from '@supabase/supabase-js'

// An unset GitHub Actions variable reaches the build as an empty string, so `??` is not enough:
// `||` treats both undefined and '' as missing. Without this the client throws on load (blank page).
const url = import.meta.env.VITE_SUPABASE_URL || undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || undefined

/** False when the build has no Supabase settings; the app then shows a setup notice. */
export const isConfigured = Boolean(url && anonKey)

// PKCE keeps the login code in the query string (?code=...). The default
// implicit flow puts tokens in the URL hash, which collides with hash routing.
export const supabase = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'not-configured',
  {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
)

/** Where Supabase should send people after email or Google sign-in. */
export function authRedirectUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}
