# Focus Web: Plan (GitHub Pages + Supabase)

Status (2026-10-10): Phases 0 to 3 are written and Phases 0 to 1 are confirmed live. Phases 4 to 6 are not started. Section 9 tracks each phase; section 13 lists what was built and where it differs from this plan. Code and migrations are in this repo (`web/`, `supabase/`).

## 1. What we have so far, and what carries over

| From the Android research | Carries to web? | Notes |
|---|---|---|
| Session model (start, planned length, end, status, stats) | Yes | Core of the web app |
| Tags on sessions and tag-based stats | Yes | Drives the reports |
| Per-session distraction tracking | Partly | Browser can see tab switches (Page Visibility API), not other apps |
| Daily and weekly stats, weekly comparison, milestones, streaks | Yes | Computed in the database |
| Zen mode configuration | Partly | Becomes a distraction-free full-screen mode plus ambient sound |
| Focus sounds | Yes | Use own or properly licensed sounds |
| Groups, invites, leaderboards, reactions, live focus | Yes | The backend now exists, so social is realistic, not a v3 dream |
| Room schema versioning lesson | Yes | Use versioned SQL migrations from day one |
| Usage stats, app limits, app blocking, overlays, accessibility, foreground services, boot receivers | **No** | A web page cannot see or control other apps. This is the Android app's job |
| Website blocking | No (web page) | Possible later with a browser extension |

Honest summary: the web app is a **focus timer, tracker and community**, not a blocker. It stands alone, and the Android app can later share the same Supabase backend.

## 2. Product scope

### v1 (web)
- Sign in (email magic link, Google)
- Focus timer with tags, break timer and session history
- Distraction counter (tab left during a session)
- Daily and weekly stats, tag breakdown, streaks, milestones
- Zen mode: full-screen, minimal UI, optional ambient sound
- Installable PWA, works offline for the timer
- Settings (default lengths, sounds, theme)

### v2 (social)
- Groups with invite links
- Live "who is focusing now" using Supabase Realtime Presence
- Weekly group leaderboard, reactions between members

### Later
- Web push reminders
- Chrome/Edge extension for website blocking
- Android companion app writing sessions to the same backend (`source = 'android'`)

## 3. Architecture

```
Browser (GitHub Pages, static SPA / PWA)
   |  supabase-js (anon key + user JWT)
   v
Supabase
  - Auth (magic link, Google)
  - Postgres + Row Level Security (all data and rules)
  - RPC functions (start_session, end_session, join_group, group_leaderboard)
  - Realtime (presence for live focus, optional reactions)
  - Storage (avatars, optional)
  - Edge Functions (later: web push, scheduled jobs)
```

GitHub Pages only serves static files, so there is no server code of ours. All trusted logic lives in Postgres functions and RLS policies.

## 4. Stack

| Layer | Choice | Why |
|---|---|---|
| Build | Vite + TypeScript | Fast, static output that GitHub Pages serves |
| UI | React (or Svelte if you prefer smaller bundles) | Large ecosystem. Pick one and stay with it |
| Routing | Hash routing (`/#/stats`) | GitHub Pages has no server-side rewrites |
| Styling | Tailwind CSS or plain CSS modules | Your choice |
| Data | `@supabase/supabase-js`, TanStack Query | Caching and refetching |
| Charts | A small chart library | For stats pages |
| PWA | `vite-plugin-pwa` | Service worker and manifest |
| Deploy | GitHub Actions to Pages | Build on push to `main` |
| Tests | Vitest for logic, Playwright for a few flows | Keep light |

## 5. Repo and hosting

GitHub Pages on a free account needs a **public** repo. The research notes about reference apps were first kept in a separate private repo. Superseded by D15: everything now lives in this one public repo. Original recommendation, kept for history:

- `focus` (private): research, AI log, Android plans, decisions. Stays as is.
- `focus-web` (public): the web app and `supabase/` migrations only.

Layout of `focus-web`:

```
focus-web/
  web/                 Vite app
  supabase/
    migrations/        versioned SQL (0001_init.sql, ...)
    seed.sql
  .github/workflows/deploy.yml
  README.md
```

Vite `base` must be `/focus-web/` for a project page (or `/` with a custom domain).

## 6. Supabase design

### Tables (all in `public`, RLS on)

| Table | Key fields |
|---|---|
| `profiles` | id (= auth user), display_name, avatar_url, timezone, created_at |
| `user_settings` | user_id, default_minutes, break_minutes, sound, zen (jsonb) |
| `tags` | id, user_id, name, color |
| `focus_sessions` | id, user_id, tag_id, group_id?, started_at, planned_seconds, ended_at, status (running / completed / abandoned), focused_seconds, distraction_count, source (web / android / extension) |
| `session_events` | id, session_id, type (blur / focus / pause / resume), at |
| `milestones` | id, user_id, type, value, achieved_at |
| `groups` | id, name, owner_id, invite_code, theme, created_at |
| `group_members` | group_id, user_id, role, joined_at |
| `reactions` | id, group_id, from_user, to_user, kind, created_at |

### Server-side rules
- **`start_session(tag_id, planned_seconds, group_id)`**: creates the row with server `now()` as start. Only one running session per user.
- **`end_session(session_id, status)`**: sets the end time server-side and computes `focused_seconds` from server timestamps, capped at planned time plus a small grace. This stops people faking big numbers for leaderboards.
- **`join_group(invite_code)`**: validates the code and adds the member.
- **`group_leaderboard(group_id, week_start)`**: security definer, checks the caller is a member, returns aggregated totals only.
- **Trigger** on new auth user creates the `profiles` and `user_settings` rows.
- Days are computed in the user's timezone. Store all timestamps in UTC.

### RLS rules (summary)
- Own rows only for sessions, events, tags, settings, milestones.
- Group data visible only to members. Members see each other's display name and avatar, and leaderboard aggregates, not raw sessions.
- No direct insert of `focused_seconds`, only through the RPCs (revoke direct insert and update on those columns, or restrict the table to RPC writes).
- Never put the `service_role` key in the frontend or the repo. The anon key is public by design and safe only because RLS is on.

### Auth setup
- Email magic link and Google provider.
- Site URL and redirect URLs must include the GitHub Pages URL (and `localhost` for development), or logins break after deploy.

## 7. Timer design (important)
- Browsers throttle timers in background tabs, so never count ticks. Store `started_at` and `planned_seconds`, then compute the remaining time from timestamps on every render.
- Distraction tracking: listen to `visibilitychange` and window blur. Log events and increment the counter. Be upfront in the UI that it only sees this tab.
- Screen Wake Lock API keeps the screen on during a session where supported.
- Notifications and a sound when the session ends. Web push for closed tabs comes later (needs an Edge Function and VAPID keys; iOS needs the PWA installed).
- If the tab is closed mid-session, resume from the server's running session on next load.

## 8. Frontend structure

```
web/src/
  app/            routes, providers, layout
  features/
    auth/
    timer/
    sessions/
    stats/
    tags/
    settings/
    groups/       (v2)
  lib/            supabase client, time helpers, types
  components/     shared UI
```

Routes (hash): `/`, `/timer`, `/history`, `/stats`, `/settings`, `/groups` (v2), `/login`.

## 9. Phases

Legend: done = built and confirmed working; written = code in the repo, not yet confirmed on the live site; open = not started.

### Phase 0: setup (S): done
- [x] Supabase project, `focus-web` repo, Vite + TypeScript app, Pages deploy via Actions
- [x] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` repo variables
- [x] Supabase CLI layout, `0001_init.sql` applied

### Phase 1: auth and profile (S): mostly done
- [x] Email magic link confirmed working end to end
- [x] Profile and settings rows created by trigger; protected routes
- [x] Google sign-in code is written (`LoginPage.tsx`)
- [ ] Google provider not configured (README step 3)
- [ ] Settings save not yet confirmed by the user

### Phase 2: timer and sessions (M): written
- [x] `start_session`, `end_session`, `log_session_event`, `session_heartbeat` with pgTAP tests (tests not yet run)
- [x] Timer driven by server timestamps, resumes after refresh (reads the running session)
- [x] Tags CRUD (in Settings), tag chosen per session and remembered
- [x] Distraction tracking from tab visibility, with session events
- [x] Break timer (client-side, not recorded)
- [x] Recent sessions list (last 8)
- [ ] Full history page (`/history`), sound and notification at the end, Screen Wake Lock

### Phase 3: stats (M): done (checked in the browser 2026-10-10)
- [x] Daily, weekly, monthly and all-time totals, week comparison, 30-day chart, tag breakdown
- [x] Streaks and milestones, all computed in Postgres (0003)

### Hardening (not in the original plan): written
- [x] 0002: time zone confirmed flag; stale sessions no longer get free credit
- [x] 0004: heartbeat presence, away time subtracted, server-supplied time zone list (D16 to D18)
- [x] 0002 to 0004 applied to the Supabase project (user confirmed 2026-10-10; health check passed all 21 checks)

### Phase 4: zen mode, PWA, polish (M): open
- [ ] Zen full-screen mode and ambient sound (`sound` and `zen` columns exist, no UI)
- [ ] PWA manifest, offline timer shell, install prompt (self-host the font first)
- [ ] Accessibility pass, mobile layout, empty states

### Phase 5: social (L): open
- [ ] Groups, invite links, join flow (tables not created yet)
- [ ] Realtime presence for live focus
- [ ] Weekly leaderboard RPC and UI, designed knowing presence can be faked
- [ ] Reactions
- [ ] Abuse controls: rate limits on invites and joins, leave and remove members

### Phase 6: later
- [ ] Web push, extension for site blocking, Android companion (`source = 'android'`)

## 10. Security and privacy checklist
- [x] RLS enabled on every table (pgTAP isolation tests written, not yet run)
- [x] No `service_role` key anywhere in the repo or build (checked 2026-10-10)
- [x] Input validation in RPCs and table checks (length limits, allowed values)
- [ ] Privacy note in the app: what is stored (include the Google Fonts request), how to export and delete data. Delete exists; export does not
- [x] Account deletion removes all user data (`delete_my_account`, cascades from `auth.users`)
- [ ] Dependabot or regular dependency updates

## 11. Risks

| Risk | Mitigation |
|---|---|
| Users expect app blocking from a web app | Say clearly it is a timer and tracker. Point to the Android app and extension as the blockers |
| Leaderboard cheating | Server-side time computation, daily caps |
| Free-tier limits and project pausing on inactivity | Check current Supabase limits before launch; plan for a paid tier or a keep-alive if the app gets real use |
| Background tab throttling | Timestamp-based timer |
| Broken logins after deploy | Redirect URLs set for the Pages URL |
| Public repo exposure | Split repos, no secrets in either |

## 12. Decisions (resolved 2026-10-10)
1. Repos: two, private `focus` and public `focus-web` (D9).
2. Framework: React (D10).
3. Auth: email magic link plus Google (D11).
4. Domain: default `github.io` URL (D12).
5. Still open: check that "Focus" is free as a domain and on the Play Store before branding work.
6. Single repo (D15, supersedes item 1).

Implementation notes for Phases 0 and 1 are in the `focus-web` repo (`README.md`). Differences from this plan: PKCE auth flow (D13); `0001_init.sql` holds profiles, settings, tags, sessions, session events and milestones, while groups, members and reactions wait for the social phase; a `delete_my_account` function and `server_time` function were added.

## 13. As built (differences from this plan)

- **Auth:** PKCE flow because of hash routing (D13).
- **Tables created so far:** `profiles`, `user_settings`, `tags`, `focus_sessions`, `session_events`, `milestones`. Groups, members and reactions wait for Phase 5.
- **Extra columns:** `profiles.timezone_confirmed` (0002); `focus_sessions.last_seen_at` and `present_seconds` (0004). `group_id` is not on sessions yet.
- **Functions:** `start_session`, `end_session`, `log_session_event`, `session_heartbeat`, `server_time`, `timezone_names`, `my_stats`, `award_milestones`, `delete_my_account`; internal helpers `presence_required`, `session_away_seconds`, `session_credit`. `join_group` and `group_leaderboard` are not written.
- **Session status rules:** `completed` needs the planned time to have passed and 80% verified presence; early ends and unverified finishes are `abandoned` and keep verified time (D16, D17).
- **Pause:** not supported (D14); `session_event_type` is only `blur` and `focus`.
- **Routes built:** `/`, `/stats`, `/settings`, `/login`. `/history` and `/groups` are not built; the timer lives on the home page.
- **Stack as built:** React 19, React Router 7 (hash), TanStack Query 5, Supabase JS 2, Vite 7, Vitest 3, TypeScript 5.8. Plain CSS and a hand-drawn SVG chart (no Tailwind, no chart library). No PWA plugin yet.
- **Deploy:** one GitHub Actions workflow: `npm ci`, typecheck, test, build, deploy to Pages. Vite `base` follows the repository name.
