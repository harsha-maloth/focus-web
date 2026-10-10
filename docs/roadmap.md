# Roadmap

Updated 2026-10-10. Android-first (D27); the Supabase backend is kept for later sync.

## Web track: removed 2026-10-10 (D27)
The web app is gone from the repo (git history keeps it). Supabase stays for later Android sync. The old web phase table and next actions are in git history and `web-plan.md` (archived).

## Next actions (in order)
1. Push, read the first CI result of the Android build, fix errors (never compiled; Room and KSP are new).
2. Set the optional signing-key secret so APK updates install over old ones (`android/README.md`).
3. Install on the phone and compare the 7-day numbers with the phone's own Digital Wellbeing.
4. Outside git: switch off GitHub Pages; decide whether to delete the `VITE_SUPABASE_*` Actions variables (`ops-log.md`).
5. Run `supabase test db` once, if sync is still planned.
6. Hand-test limits on the phone (README "Turning blocking on"), then step 3, the focus timer.

## Android track (scaffold, usage, 7-day view and limits written 2026-10-10, never built)

Native Kotlin and Compose; blocks apps, which a web page cannot. Research is in `research-log.md`, `reference-structure.md` and `android-requirements.md`; planned design in `architecture.md`.

### MVP build order
- [~] **0. Scaffold**: written, not built. Gradle project, Kotlin, Compose, one module, CI workflow that builds the APK (D26). Hilt, Room and modules deferred
- [~] **1. Usage stats**: written, not built. Permission flow, per-app list, 7-day strip, Room `daily_usage` (D28), tested aggregator and week maths. Still to do: longer history views, per-app trends
- [~] **2. App limits**: written, not built. Limits tab (add, list, remove; Room `app_limit`), accessibility service foreground detection with a 30 s re-check, full-screen block activity (no overlay permission needed, D29). Still to do: edit a limit, per-day schedules, "5 minutes left" warning, restricted-settings walkthrough screen
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
- Android timer: reuse the server-timed session functions in Supabase, or keep sessions local first
- Whether the research notes should stay in this public repo (D15)
