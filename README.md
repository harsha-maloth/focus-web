# Focus

An Android app that tracks screen time and (next) blocks distracting apps. Native Kotlin and Jetpack Compose, sideloaded as an APK built by GitHub Actions. A Supabase backend (accounts, sessions, stats) is kept in `supabase/` for when the app gets sync.

The web app was removed on 2026-10-10 (D27). It stays in git history. A web page can't see or block other apps, which is why the project is now Android-first.

## Status (2026-10-10)

| Area | State |
|---|---|
| Android scaffold, usage-access flow, today's usage list | Written, never compiled or installed |
| 7-day view (tap a day) and Room storage of daily usage | Written 2026-10-10, never compiled or run |
| App limits, accessibility service, block overlay | Not started |
| Focus timer, allowed apps | Not started |
| Supabase backend (migrations 0001 to 0004, health check) | Applied and checked 2026-10-10; no client uses it yet |
| Old web app | Removed (D27). Live site may still be up until GitHub Pages is switched off (see `docs/ops-log.md`) |

See `docs/roadmap.md` for next steps.

## Layout

```
docs/                research, decisions, plans, logs (start at docs/README.md)
android/             Kotlin + Compose app, built by GitHub Actions (android/README.md)
supabase/
  migrations/        0001_init, 0002_tz_confirmed_and_stale_sessions, 0003_stats, 0004_presence_and_timezones
  checks/            read-only health check
  tests/database/    pgTAP tests (never run)
.github/workflows/   android.yml (tests and APK), docs-check.yml (changelog reminder)
CHANGELOG.md
```

## Build the app
See `android/README.md`: push to `main`, download the APK from the Actions run, sideload it.

## Supabase (kept for later sync)
1. Create a project at supabase.com and paste each file in `supabase/migrations/` into the SQL editor in order (0001 to 0004), or `supabase link` then `supabase db push`.
2. Never use the `service_role` key anywhere in this repo. The anon key is public by design and safe only because of row level security.
3. Read-only check: paste `supabase/checks/health_check.sql` into the SQL editor.
4. Tests: with the CLI and Docker, `supabase start` then `supabase test db` (53 assertions, never run).
5. The server-timed session design (heartbeats, 80% verified presence) was built for the web timer. The Android timer will decide whether to reuse it (open question in the roadmap).

## Rules to keep
- Log every change (repo, GitHub, Supabase, other services). Rules for AI agents are in `AGENTS.md`; changes made outside git go in `docs/ops-log.md`.
- Row level security stays on for every table.
- No secrets in the repo.
- Clean-room rule for the Android research: structure only, no code, text, art or assets from any reference app (`docs/decisions.md`, D2). Reference APKs are never stored here or installed.
