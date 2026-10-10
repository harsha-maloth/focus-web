# Changelog

Dates are 2026-10-10 for everything so far (the project began and reached Phase 3 the same day). Newest first.

## Session 3: merge, review, docs
- Pushed to GitHub from Termux (planning docs merged, agent rules, health check, `supabase.ts` fix, chart label fix). User reports it works: deploy succeeded and the live site behaves. Exact checks the user made were not itemised.
- Fixed the Stats chart label: the top-left text now reads "scale: 30 min" instead of a bare "30 min", and the hint under the chart shows the real 30-day total. Files: `DailyChart.tsx`, `StatsPage.tsx`. Not run locally; the deploy workflow's typecheck and build cover it. Not yet seen on the live site.
- Resolved: the milestone mismatch. Per-account query shows two accounts both named Harsha, each with 1 milestone (completed 2 and 1, abandoned 2 and 3). Nothing wrong. Completed total is now 3 (was 2 at the health check), so one more session finished since then.
- Verified in the browser (user pasted the Stats page): Stats renders with today 5 min, week 5 min, streak 1 day, 30-day chart, tag breakdown (Testing 92%, No tag 8%), one milestone, time zone Asia/Calcutta. This also shows the browser time zone was saved to the profile on first load.
- Verified: the user ran `health_check.sql` on the live Supabase project. All 21 checks PASS, none FAIL. Migrations 0001 to 0004 are in place, privileges are locked down, data is sane. Fixed the wording of check 54's detail text.
- Added `supabase/checks/health_check.sql`: a read-only query for the Supabase SQL editor that checks tables, RLS, columns, functions, privileges and data sanity (PASS, FAIL or info per check). First version failed in the SQL editor with `42601 syntax error at end of input`; comments were removed from the file (the editor appeared to reject it) and parentheses and quotes were checked as balanced. Not yet confirmed to run.
- Ops: user confirmed migrations 0002, 0003 and 0004 are applied to the Supabase project (logged in `docs/ops-log.md`). The live site still needs a hand test of the timer, Settings and Stats.
- Added `AGENTS.md` and `CLAUDE.md` (agents must log every change), `docs/ops-log.md` (dashboard and service changes), a PR template with a log checklist, and a non-blocking `docs-check` workflow that warns when code changes without a log entry.
- Merged the planning repo `focus` into this repo: docs in `docs/`, changelog at the root, `.gitignore` extended with the reference-material rules. D15 supersedes the two-repo split.
- Code review added (`docs/code-review.md`).
- Fixed `web/src/lib/supabase.ts`: empty build variables are now treated as unset (`|| undefined`), so a missing variable shows the setup notice instead of a blank page.
- Rewrote the root README (status table, setup including all four migrations, honesty rules, known limits), docs index, roadmap, web plan (phase status and as-built section), architecture (web section), glossary, commands and AI log.
- Decisions D16 to D21 recorded: heartbeat presence, credit rule, server time zone list, server-time countdown, stale-session handling, stats rules.

## Web: Phases 2 and 3 and hardening (written; see `docs/web-plan.md`)
- Migration `0004_presence_and_timezones.sql`: `session_heartbeat`, 80% presence to complete, away time subtracted, `timezone_names()`.
- Migration `0003_stats.sql`: `my_stats()` and `award_milestones()`.
- Migration `0002_tz_confirmed_and_stale_sessions.sql`: `profiles.timezone_confirmed`; stale sessions no longer earn free credit.
- Frontend: timer (server-time countdown, resume after refresh, distraction logging, break timer), tags CRUD, recent sessions, Stats page with 30-day chart, Settings with time zone picker and delete account, Google sign-in button.

## Web: Phases 0 and 1 (done, live)
- `focus-web` deployed to GitHub Pages at https://harsha-maloth.github.io/focus-web/; Supabase project connected; `0001_init.sql` applied; magic-link sign-in confirmed.
- Blank-page bug found (empty build variables treated as set) and logged; the fix reached the code only in Session 3.
- Decisions D9 to D14 recorded (two repos, React, magic link plus Google, github.io, PKCE, no pause yet).
- Phase 0 and 1 code written: Vite + React app, deploy workflow, migration 0001 (tables, RLS, session RPCs, `delete_my_account`), pgTAP tests, sign-in flow.

## Planning (in the former `focus` repo)
- Web plan written (`web-plan.md`), decisions D7 and D8 recorded, open decisions resolved.
- Extended the architecture data model (tags, session app usage, zen config, milestones); added `reference-structure.md`.
- Added `android-requirements.md` (permissions, APIs, dependency stack, plan changes).
- Created the repo structure and documentation: AI log, research log, commands log, architecture, roadmap, decisions, glossary. Project named Focus.
