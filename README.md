# Focus (web)

A focus timer, tracker and community that runs in the browser. Static site on GitHub Pages, data and rules in Supabase.

A web page can't see or block other apps. This is a timer and tracker, not a blocker.

## Status

Phases 0 to 3 are written: scaffold, deploy workflow, database migrations, email-link and Google sign-in, protected routes, profile and timer-default settings, and the focus timer (server-timed sessions, distraction logging on tab leave, recent sessions list, tags, a client-side break timer), and Phase 3 stats (daily, weekly and monthly totals, week comparison, 30-day chart, tag breakdown, streaks, milestones, all computed in Postgres). Zen mode, PWA and the community come later.

Migration 0004 hardens the timer: the open page sends a heartbeat, a session completes only with enough verified time, time away from the tab is no longer counted as focused, and the time zone list comes from the server so the app never sets a zone the database rejects.

## Layout

```
web/                 Vite + React + TypeScript app
supabase/
  migrations/        versioned SQL (0001_init, 0002_tz_confirmed_and_stale_sessions, 0003_stats, 0004_presence_and_timezones)
  tests/database/    pgTAP tests (row isolation, session rules)
.github/workflows/   build and deploy to GitHub Pages
```

## One-time setup

### 1. Supabase project
1. Create a project at supabase.com.
2. Apply the schema. Either paste each file in `supabase/migrations/` (in order) into the SQL editor and run it, or use the CLI:
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
- Sessions are written only through `start_session`, `end_session`, `log_session_event` and `session_heartbeat`, which use server time.
- Credited time comes only from the server: elapsed time, minus whatever the heartbeats could not verify or the person spent away from the tab (the larger of the two, not both). Completing needs 80% verified presence (`presence_required()` in 0004, one place to change).
- No secrets in the repo. The anon key is public by design and is safe only because of row level security.

## Known limits
- A web page cannot prove a person is there. Heartbeats make idle or scripted sessions much harder to credit, but a script that fakes heartbeats can still do it. Anything that ranks people against each other (the community phase) should be designed knowing this.
- A phone that suspends the page misses heartbeats. A long enough absence (more than about 20% of a session) means it counts as ended early, with the verified time kept.
