# Focus (web)

A focus timer, tracker and community that runs in the browser. Static site on GitHub Pages, data and rules in Supabase.

A web page can't see or block other apps. This is a timer and tracker, not a blocker.

## Status

Phases 0 and 1 are written: project scaffold, deploy workflow, first database migration, email-link and Google sign-in, protected routes, profile and timer-default settings. The timer itself is Phase 2.

## Layout

```
web/                 Vite + React + TypeScript app
supabase/
  migrations/        versioned SQL (0001_init.sql)
  tests/database/    pgTAP tests (row isolation, session rules)
.github/workflows/   build and deploy to GitHub Pages
```

## One-time setup

### 1. Supabase project
1. Create a project at supabase.com.
2. Apply the schema. Either paste `supabase/migrations/0001_init.sql` into the SQL editor and run it, or use the CLI:
   `supabase link --project-ref <ref>` then `supabase db push`.
3. Project Settings > API: copy the **Project URL** and the **anon** (or publishable) key. Never use the `service_role` key anywhere in this repo.

### 2. Auth settings (Authentication > URL Configuration)
- **Site URL:** `https://<your-github-username>.github.io/focus-web/`
- **Redirect URLs:** add the same URL, plus `http://localhost:5173/focus-web/` for development.
- Email sign-in is on by default. Magic links use the PKCE flow, so a link only works in the browser that asked for it.

### 3. Google sign-in
1. In Google Cloud Console create an OAuth client (type: Web application).
2. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. In Supabase: Authentication > Providers > Google. Paste the client ID and secret, then enable it.

### 4. Run locally
```
cd web
cp .env.example .env.local     # fill in the URL and anon key
npm install                    # creates package-lock.json: commit it
npm run dev                    # http://localhost:5173/focus-web/
```
Other scripts: `npm test`, `npm run typecheck`, `npm run build`.

### 5. Deploy
1. Push this repo to GitHub as **`focus-web`** (public, so free GitHub Pages works). If you use another name, the workflow follows it automatically, but update the URLs in step 2.
2. Settings > Secrets and variables > Actions > **Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Settings > Pages > Source: **GitHub Actions**.
4. Push to `main`. The workflow typechecks, tests, builds and deploys.

Commit `web/package-lock.json` before the first push: the workflow uses `npm ci`.

## Database tests
With the Supabase CLI and Docker: `supabase start`, then `supabase test db`.

## Rules to keep
- Row level security stays on for every table.
- Sessions are written only through `start_session`, `end_session` and `log_session_event`, which use server time.
- No secrets in the repo. The anon key is public by design and is safe only because of row level security.
