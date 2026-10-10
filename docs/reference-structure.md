# Reference Structure (Regain, focus-timer module)

Source: class names recovered from the reference app. Names only; no code or content. The app's screens, ViewModels and use cases are obfuscated (`a`, `b`, `A0`...), so only data-model names are readable.

This is used to design Focus's own data model and phases. Focus uses its own names and schema.

## Module size
The focus-timer module is by far the largest (372 classes). Most of it is social, not the timer itself.

## Concept groups found (data models)

### Core focus (MVP-relevant)
- Focus session, with per-session app usage and per-session distracting-app usage
- Session stats, daily stats, weekly stats and weekly comparison
- Timer configuration, allowed apps for a session
- User tags on sessions, with tag summaries
- Milestones, completed-focus cumulative sums by date
- Report share data (shareable session report)

### Zen mode
- Zen mode configuration, day-wise configuration, configuration with tag

### Sound
- Last-played music file (focus sounds)

### Social (later phases, needs a backend)
- Groups: metadata, members, pinned, themes, categories, preferences, search, suggestions
- Group live focus data, inactive members, kick member
- Invites: invite details, generated invite links
- Reactions and nudges between members, wake-up nudges
- Leaderboards (weekly), group ranks, leagues and league tiers

## Lessons for Focus

1. **Schema versions.** Model names carry suffixes up to `V34` (e.g. session V7 through V34). The reference changed its database schema about 30 times. Plan Room migrations from day one: export schemas, write migration tests, prefer auto-migrations where possible.
2. **Per-session app usage is a first-class table.** A session records which apps were used and which of them were distracting. Design `session_app_usage` with a `distracting` flag.
3. **Tags make stats useful.** Letting users label sessions (study, work, reading) drives most of the reports.
4. **Social is most of the code.** Groups, reactions, leaderboards and leagues dominate the module. Keep all of it out of v1.
5. **Heartbeat data for stats.** A "stats heartbeat" model suggests periodic sampling during a session. Consider sampling the foreground app at intervals during sessions.

## Focus data model additions (reflected in `architecture.md`)
- `focus_tag`, `focus_session.tag_id`
- `session_app_usage` (session, package, foreground_ms, distracting)
- `zen_config` (days mask, window, allowed apps)
- `milestone` (type, value, achieved_at)
- Room schema export and migration tests from day one
