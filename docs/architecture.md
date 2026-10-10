> **Archived 2026-10-10 (D27):** the web app was removed. Kept for history and because the Supabase design still applies.

# Focus architecture

Two parts: the **web app** (built, below) and the **Android app** (planned, further down).

## Web (as built)

```
Browser: static React app on GitHub Pages (hash routing)
   | supabase-js (anon key + user JWT, PKCE auth)
   v
Supabase
  Auth      magic link, Google (provider not yet enabled)
  Postgres  tables with row level security; all rules in SQL functions
  RPCs      start_session, end_session, log_session_event, session_heartbeat,
            server_time, timezone_names, my_stats, award_milestones, delete_my_account
```

There is no server code of our own. Clients can read their own rows and edit only profile, settings and tags; sessions, events and milestones are written only by security-definer functions using server time.

### Session lifecycle
1. `start_session(tag, seconds)`: one running session per user (unique index); closes a stale one first (D20).
2. While open, the page sends `session_heartbeat` every 30 s and logs `blur` and `focus` events when the tab is hidden and shown.
3. `end_session(id, status)`: sets the end time on the server. Credit = span minus the larger of unverified and away time. `completed` needs the planned time elapsed and 80% verified presence; otherwise it is stored as `abandoned` with the verified time (D16, D17).
4. `my_stats()` reads completed and abandoned sessions; `award_milestones()` writes milestone rows.

### Frontend layout (`web/src`)
```
app/         router and providers
components/  Shell (nav, time zone bootstrap), Ring, SetupNotice
features/    auth, home, settings, stats, tags, timer
lib/         supabase client, pure helpers with unit tests (time, timer, timezone, stats, authErrors)
```

Schema, phases and differences from the original plan: `web-plan.md`. Decisions: `decisions.md`.

---

# Android (planned; scaffold written, see D26)

Built so far: one `app` module with a usage screen (`android/`). The module layout below is the target, not the current state.

Native Android, Kotlin, Jetpack Compose. One Gradle module per feature, shared core layers underneath.

## Stack
- UI: Jetpack Compose, Material 3
- DI: Hilt
- Local data: Room (separate DBs or schemas per domain)
- Background: WorkManager (scheduled jobs), foreground service (active focus session)
- Blocking: Accessibility Service plus overlay window
- Usage data: `UsageStatsManager`
- Prefs: DataStore
- Later: Firebase (auth, remote config, crash reporting), billing library

## Module layout

```
app/                       entry point, navigation, DI wiring
core/
  core-data/               Room base, DataStore, repositories shared by features
  core-domain/             models and use cases shared by features
  core-ui/                 theme, components, design tokens
  core-service/            accessibility service, foreground service, receivers
feature/
  feature-usage/           usage stats collection and screens
  feature-limits/          per-app daily limits
  feature-focus/           focus timer, sessions, allowed apps, schedules
  feature-blocking/        overlay, block rules, short-form feed detection (later)
  feature-onboarding/      permission walkthrough, OEM-specific help
  feature-settings/
  feature-insights/        daily and weekly charts
  feature-account/         later
  feature-subscription/    later
```

## Core flows

### Usage tracking
`UsageStatsManager` -> `UsageCollector` (periodic worker) -> Room `usage_event` / `daily_usage` -> repositories -> UI.

### App limit enforcement
Accessibility Service emits foreground-app changes -> `LimitEngine` reads limits and today's usage -> if over limit, ask `OverlayController` to show a block screen.

### Focus session
User starts session -> foreground service holds state and notification -> `BlockEngine` treats non-allowed apps as blocked until the timer ends -> session saved to Room.

### Reliability (treat as a feature)
- Boot receiver restarts services.
- Watchdog worker checks the accessibility service is enabled and running.
- Time-change and time-zone receivers recompute session and limit windows.
- Battery-optimization and autostart guidance per OEM (Xiaomi, Samsung, others).

## Data model (initial)

| Table | Key fields |
|---|---|
| `app_limit` | package, daily_limit_ms, enabled, created_at |
| `daily_usage` | date, package, foreground_ms, launch_count |
| `focus_session` | id, start, planned_end, actual_end, allowed_packages, status |
| `focus_schedule` | id, days_mask, start_min, end_min, allowed_packages, enabled |
| `block_event` | timestamp, package, reason (limit/focus/feed) |
| `setting` | key, value |
| `focus_tag` | id, name, color |
| `session_app_usage` | session_id, package, foreground_ms, distracting |
| `zen_config` | id, days_mask, start_min, end_min, allowed_packages, enabled |
| `milestone` | id, type, value, achieved_at |

Add `tag_id` to `focus_session`. Export Room schemas and write migration tests from the first release (see `reference-structure.md`).

## Play Store policy risks
- Accessibility API use needs a clear in-app disclosure, a prominent consent screen and a Play Console declaration. Core purpose must be genuine.
- `PACKAGE_USAGE_STATS` and overlay permissions need clear justification.
- Device admin is optional; avoid in v1 unless needed.

## Out of scope for v1
Social, leagues and referrals, AI coach, website blocking, short-form feed blocking, subscriptions.
