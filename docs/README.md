# Focus: project docs

Research, decisions, plans and logs for the whole project. Code is in `../android` and `../supabase` (the web app was removed, D27); setup and status are in the root `../README.md`. These docs were merged in from the former private planning repo `focus` (D15).

## Where to start
- Resuming work: read the latest entry and the context block at the end of `ai-log.md`, then `roadmap.md`.
- What is wrong or unfinished: `code-review.md`.

## Map

| File | What it is |
|---|---|
| `roadmap.md` | Current state of both tracks, next actions, open questions |
| `web-plan.md` | Archived web plan; section 6 and 13 still describe the Supabase schema |
| `code-review.md` | Archived review of the web code and database |
| `decisions.md` | Decision records D1 to D29: what was chosen and why |
| `ai-log.md` | Chronological log of AI-assisted sessions, with a context block to paste into a new session |
| `../CHANGELOG.md` | Dated changes to the repo |
| `architecture.md` | Web architecture as built, and the planned Android architecture |
| `android-requirements.md` | Android permissions, framework APIs, dependency stack, MVP decisions |
| `research-log.md` | What was learned from studying reference apps (structure only) |
| `reference-structure.md` | Concepts in the reference focus module and lessons for the data model |
| `commands.md` | Commands used (PowerShell for the research, shell and Termux for the web repo) |
| `ops-log.md` | Changes made outside git (Supabase, GitHub settings, Google Cloud) |
| `../AGENTS.md` | Rules for AI agents, including the log-every-change rule |
| `glossary.md` | Terms used in the project |

## Ground rules (clean-room)
- Reference apps were studied only to understand how apps of this kind are organized.
- No code, text, art, prompts, sounds, mascots or other assets from any reference app are in Focus.
- Everything in Focus is written, designed and named independently.
- The reference APKs were modified builds from unofficial sources. Never install them on a real device. They are not stored in this repo (see `../.gitignore`).

## Keeping the docs current
At the end of each work session: add a dated entry to `ai-log.md` and `../CHANGELOG.md`, update the state table in `roadmap.md`, and update the context block. Record any new decision in `decisions.md` with the next number.
