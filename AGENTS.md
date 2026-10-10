# Instructions for AI agents (and humans)

This file is read by AI coding agents working in this repo. `CLAUDE.md` points here.

## The rule: log every change

Any change to the repo, GitHub settings, Supabase, or any other service this project uses **must be logged in the same session, before you finish**. Do not wait to be asked. A change that is not logged did not happen as far as the next session is concerned.

### What counts as a change
- Any commit or file edit: code, migrations, tests, workflows, config, docs.
- Supabase: SQL run in the dashboard, migrations applied, auth settings, redirect URLs, providers, API keys rotated, project created or paused.
- GitHub: repo settings, Pages source, Actions variables and secrets (names only), branch rules, visibility, workflow runs that failed or were fixed.
- Google Cloud or any other provider: OAuth clients, consent screen, redirect URIs.
- Decisions, discoveries and bugs, even when no file changed.

### Where to log (do all that apply)

| What happened | Update |
|---|---|
| Anything done | `CHANGELOG.md`: add a bullet under today's heading (create it if missing). Newest first. |
| A work session | `docs/ai-log.md`: add or extend a dated "Session N" entry: goal, done, not verified, open items. Refresh the context block at the end. |
| Dashboard or service change (no git trace) | `docs/ops-log.md`: one row per change: date, service, what, who ran it, how to undo. |
| A choice with trade-offs | `docs/decisions.md`: next number (D31, D32, ...), what and why. |
| Phase or feature state changed | `docs/roadmap.md` state table and `docs/web-plan.md` phase checklist. |
| New or changed migration | `README.md` layout and setup lists, `docs/web-plan.md` section 13 (as built), and note whether it is **applied** to the Supabase project. |
| Bug found or fixed, risk found | `docs/code-review.md`. |
| New command worth reusing | `docs/commands.md`. |
| New term | `docs/glossary.md`. |

### How to write entries
- Date (YYYY-MM-DD), plain words, short. Say what changed and why.
- Separate **done and verified** from **written but not verified**. Never write "works" unless it was run or the user confirmed it.
- Record failures and dead ends too.
- Never put secrets in a log: no `service_role` key, no passwords, no tokens. The anon key and project URL are public but still avoid pasting them.
- If you could not run something (no network, no database), say so.

## Before you finish a session
1. Re-read `git status` (or list the files you changed) and check each change has a log entry.
2. Update the status table in the root `README.md` if the state of any feature changed.
3. Update the context block in `docs/ai-log.md`.
4. Tell the user which log files you updated.

## Project rules to keep
- Row level security stays on for every table.
- Sessions, events and milestones are written only through the security-definer functions, using server time.
- Never use or write the Supabase `service_role` key anywhere in the repo or the app.
- Clean-room: the Android research studied structure only. Do not add code, text, art or assets from any reference app. Do not add APKs or extracted material (see `.gitignore`).
- Migrations are numbered and append-only. Never edit one that has been applied; add the next number.
- Confirm with the user before deleting data, dropping tables, or changing auth settings.

## Where things are
Start at `docs/README.md`. Current state and next steps: `docs/roadmap.md`. Known issues: `docs/code-review.md`.
