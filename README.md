# Focus

A focus timer, tracker and (later) community that runs in the browser: a static site on GitHub Pages, with data and rules in Supabase. An Android app that blocks distracting apps is planned on the same backend.

A web page can't see or block other apps. This is a timer and tracker, not a blocker.

Live: https://harsha-maloth.github.io/focus-web/

## Status (2026-10-10)

| Area | State |
|---|---|
| Deploy to GitHub Pages, Supabase connected, magic-link sign-in | Done, live |
| Settings (name, time zone, timer defaults), tags, delete account | Written, database ready, save not confirmed live |
| Focus timer: server-timed, resumes after refresh, distraction log, break timer, recent sessions | Written. Live database shows 7 sessions recorded; browser behaviour not hand-checked |
| Stats: totals, week comparison, 30-day chart, tags, streaks, milestones | Done: checked in the browser 2026-10-10 |
| Heartbeat presence and server time zone list (migration 0004) | Migrations 0002 to 0004 applied; health check passed 2026-10-10 |
| Google sign-in | Code written, provider not configured |
| Sound, notifications, wake lock, zen mode, history page, PWA shell | Written 2026-10-10, not run or seen in a browser |
| Groups and leaderboards | Not started |
| Android app | Research done, scaffold not started |

See `docs/roadmap.md` for next steps and `docs/code-review.md` for known issues.

## Layout

```
docs/                research, decisions, plans, logs (start at docs/README.md)
web/                 Vite + React + TypeScript app (PWA: public/sw.js, manifest, icons)
supabase/
  migrations/        0001_init, 0002_tz_confirmed_and_stale_sessions, 0003_stats, 0004_presence_and_timezones
  tests/database/    pgTAP tests (row isolation, session rules, stats, presence)
.github/workflows/   typecheck, test, build and deploy to GitHub Pages
CHANGELOG.md
```

## One-time setup

### 1. Supabase project
1. Create a project at supabase.com.
2. Apply the schema: paste each file in `supabase/migrations/` into the SQL editor **in order** (0001, 0002, 0003, 0004), or run `supabase link --project-ref <ref>` then `supabase db push`. The app needs all four.
3. Project Settings > API: copy the **Project URL** and the **anon** (or publishable) key. Never use the `service_role` key anywhere in this repo.

### 2. Auth settings (Authentication > URL Configuration)
- **Site URL:** `https://<your-github-username>.github.io/focus-web/`
- **Redirect URLs:** add the same URL, plus `http://localhost:5173/focus-web/` for development.
- Email sign-in is on by default. Magic links use the PKCE flow, so a link only works in the browser that asked for it.

### 3. Google sign-in (optional, not yet set up for the live site)
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
Other scripts: `npm test`, `npm run typecheck`, `npm run build`. Needs Node 20.19 or newer.

### 5. Deploy
1. Push this repo to GitHub as **`focus-web`** (public, so free GitHub Pages works). If you use another name the workflow follows it, but update the URLs in step 2.
2. Settings > Secrets and variables > Actions > **Variables**: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. If a variable is missing the app shows a "connect Supabase" notice instead of a blank page.
3. Settings > Pages > Source: **GitHub Actions**.
4. Push to `main`. The workflow typechecks, tests, builds and deploys. Commit `web/package-lock.json` first: the workflow uses `npm ci`.

## Database health check
Paste `supabase/checks/health_check.sql` into the Supabase SQL editor. It is read-only and reports PASS, FAIL or info for tables, RLS, migrations, privileges and data.

## Database tests
With the Supabase CLI and Docker: `supabase start`, then `supabase test db`. The file has 53 assertions; it has not been run yet.

## How the timer stays honest
- Sessions are written only through `start_session`, `end_session`, `log_session_event` and `session_heartbeat`, which use server time. Clients cannot insert or update sessions, events or milestones.
- The page counts down against server time, never by counting ticks.
- The open page sends a heartbeat every 30 s. The server counts a gap as presence only if it is 90 s or less.
- Credited time = the span of the session minus the larger of (time with no heartbeat) and (time away from the tab). Completing needs 80% verified presence (`presence_required()` in 0004 is the one place to change it); otherwise the session is stored as ended early with the verified time.

## Rules to keep
- Log every change (repo, GitHub, Supabase, other services). Rules for AI agents are in `AGENTS.md`; changes made outside git go in `docs/ops-log.md`.
- Row level security stays on for every table.
- No secrets in the repo. The anon key is public by design and is safe only because of row level security.
- Clean-room rule for the Android research: structure only, no code, text, art or assets from any reference app (`docs/decisions.md`, D2). Reference APKs are never stored here or installed.

## Known limits
- A web page cannot prove a person is there. A script that fakes heartbeats can still earn credit. Anything that ranks people against each other (the community phase) must be designed knowing this.
- A phone or background tab that suspends the page misses heartbeats. An absence of more than about 20% of a session means it counts as ended early, with the verified time kept.
- Fonts: the page uses system fonts and makes no request to Google (D22).
