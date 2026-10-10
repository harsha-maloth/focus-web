# Roadmap

Updated 2026-10-10. Two tracks share one repo and, later, one Supabase backend.

## Web track (active)

Details, schema and as-built notes: `web-plan.md`. Review findings: `code-review.md`.

| Phase | What | State |
|---|---|---|
| 0 | Setup: Supabase, repo, Pages deploy, migration 0001 | Done, live |
| 1 | Auth and profile: magic link, protected routes, settings | Magic link confirmed. Google provider not configured. Settings save unconfirmed |
| 2 | Timer and sessions: server-timed sessions, tags, distraction log, recent list | Written. 7 sessions recorded on the live database; browser flow not hand-checked |
| 3 | Stats: totals, streaks, milestones, 30-day chart, tag breakdown | Done: checked in the browser 2026-10-10 (chart scale label is confusing, see code-review) |
| Hardening | 0002 to 0004: stale sessions, heartbeat presence, time zone list | Applied and verified by the health check (2026-10-10). pgTAP tests not yet run |
| 4 | Zen mode, sound, notifications, wake lock, PWA, history page, polish | Open |
| 5 | Social: groups, presence, leaderboard, reactions, abuse controls | Open |
| 6 | Web push, site-blocking extension, Android companion | Later |

### Next actions (in order)
1. Push the merged repo (with the `supabase.ts` `||` fix).
2. ~~Apply migrations 0002 to 0004~~ Done (confirmed 2026-10-10).
3. Check the live site by hand (the database side already looks healthy): save Settings, create a tag, run a short session (1 minute), check Recent sessions and Stats.
4. Run `supabase test db` (CLI and Docker) and fix anything it finds.
5. Configure Google sign-in (README step 3).
6. Phase 4 items that change the timer experience: sound and notification at the end, then wake lock, then a history page.

## Android track (not started)

Native Kotlin and Compose; blocks apps, which a web page cannot. Research is in `research-log.md`, `reference-structure.md` and `android-requirements.md`; planned design in `architecture.md`.

### MVP build order
- [ ] **0. Scaffold**: Android Studio project, Kotlin, Compose, Hilt, Room, module layout
- [ ] **1. Usage stats**: usage-access permission flow, collector, Room tables, daily and weekly screens
- [ ] **2. App limits**: limits CRUD, accessibility service foreground detection, overlay block screen
- [ ] **3. Focus timer**: foreground service, allowed-apps list, session history
- [ ] **4. Reliability**: boot receiver, watchdog worker, time-change handling, OEM battery guidance
- [ ] **5. Onboarding**: permission walkthrough (usage access, accessibility, overlay, notifications)
- [ ] **6. Polish**: widget, notifications, theming, empty states, tests

### After the MVP
- [ ] Schedules (recurring focus windows)
- [ ] Short-form feed detection and blocking (check Play policy first)
- [ ] Website blocking
- [ ] Streaks and rewards
- [ ] Accounts and cloud backup (can reuse the Supabase backend; `source = 'android'`)
- [ ] Subscriptions
- [ ] AI coach, groups and invites

### Definition of done per step
- Works on at least one Pixel-like device and one Samsung or Xiaomi device
- Survives reboot and force-stop recovery paths where Android allows
- No crashes in a 24-hour soak
- Notes added to `ai-log.md` and `CHANGELOG.md`

## Open questions
- Is "Focus" free as a domain and on the Play Store? (before any branding work)
- Android: final package id (e.g. `app.focus.<yourname>`)
- Android: Play Store or side-load only at first
- Monetization model
- Pause support in the web timer (D14): needs its own server-side accounting
- Whether the research notes should stay in this public repo (D15)
