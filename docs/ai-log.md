# AI Log

Chronological record of the AI-assisted sessions. Newest entries go at the bottom. Times are IST (UTC+05:30).

---

## Session 1 — 2026-10-10

### Goal
Build a Focus app by studying how existing apps are structured, without copying their code or content.

### Timeline

1. **BitLife APK (first reference).**
   - User shared a JADX project file (`bitlife.apk.jadx`). It is only a JSON session config pointing to `bitlife.apk`, with no code in it.
   - Finding: BitLife is a Unity IL2CPP game. The Java/dex side is an ad/analytics wrapper. Real logic is in native `libil2cpp.so`, so decompiling shows little.
   - Direction given: don't reuse their code; build an original game from a data-driven design (age loop, stats, JSON event engine).
   - Zip report showed: Unity + IL2CPP, heavy ad stack, Firebase/Crashlytics/Embrace/AppsFlyer, localized text files.
   - Safety note: the APK was re-signed with a test key (`TESTKEY.SF`) and carried PairIP, so it is a modified build. Not to be installed.
   - Extracted `libil2cpp.so` and `global-metadata.dat` for a class-name dump. The Il2CppDumper step was not completed. Project moved on.

2. **User changed target: new app "Regain" (`regain.zip`).**
   - Report showed native Android (3 dex files, 2 tiny `.so`, no Flutter/RN/Unity).
   - Features inferred from file names: focus timer, schedules, app blocking, permission onboarding (accessibility, overlay, OEM variants), usage stats, streaks/badges/leagues, referrals, AI coach, paywall.
   - Also a modified build: third-party signature `HEMANT.SF`, `Modder_Hub_*` files, `bin/mt/signature` classes. Not to be installed.
   - JADX step got stuck, so we extracted class names directly from the dex files with PowerShell.

3. **Class-name analysis.**
   - App code lives in `ai/blox100/*`, a feature-module layout.
   - Blocking runs on accessibility and monitor services; data in Room databases; background work via WorkManager; many broadcast receivers for boot, time change and notifications.
   - Details recorded in `docs/research-log.md`.

4. **Decision: new project name "Focus".** Repo created with logs, research notes, commands, architecture and roadmap.

5. **Extra extraction pass (structure and platform facts only).**
   - Collected manifest permissions and actions, Android framework classes referenced, and library versions.
   - Written up in `docs/android-requirements.md`.
   - Findings: reference permission set is larger than the MVP needs (ads, device admin, exact alarms, `QUERY_ALL_PACKAGES`). Several are Play-restricted. No VpnService, so website blocking is not VPN-based.
   - Library snapshot shows Compose, Room, WorkManager, Hilt, Glance and DataStore. Use current stable versions, not the old numbers.
   - A mod credit string was found in the version metadata, confirming the APK is a modded build.
   - Screen/ViewModel inventory came back empty: those classes are obfuscated. Data-model names are readable and were recorded in `docs/reference-structure.md`.
   - Key lessons: schema changed ~30 times (plan Room migrations from day one), sessions need per-session app usage and tags, and most of the focus module is social features (out of v1).
   - Architecture data model updated with tags, session app usage, zen config and milestones.

6. **Pivot: web app (GitHub Pages + Supabase).**
   - User asked to review everything and plan a web version.
   - Key finding: a browser cannot see or block other apps, so the web app is a timer, tracker and community; blocking stays with Android (and a future extension).
   - Plan written in `docs/web-plan.md`: scope, architecture, schema, RLS, timer design, phases, risks, open decisions.
   - Open decisions: one repo or two (GitHub Pages free needs a public repo), React vs Svelte, auth providers, domain.

### Decisions
- Name: **Focus**.
- Platform: native Android (Kotlin, Jetpack Compose).
- Clean-room rule: structure only, nothing copied. See `docs/decisions.md`.

### Open items
- Scaffold the Android project.
- Decide app package id and final branding.
- Decide whether the first release includes short-form (Shorts/Reels) blocking (Play policy risk, see roadmap).

---

## Session 2 — 2026-10-10

### Goal
Resolve the web plan's open decisions and build Phases 0 and 1.

### Done
1. Re-read the whole repo to rebuild context.
2. Decisions confirmed by the user: two repos, React (left to the assistant), email magic link plus Google, default github.io URL (D9 to D12).
3. Created the `focus-web` repo: Vite + React + TypeScript app, GitHub Actions deploy to Pages, `supabase/migrations/0001_init.sql` (tables, row level security, `start_session`, `end_session`, `log_session_event`, `server_time`, `delete_my_account`), pgTAP tests, and the sign-in flow with protected routes, profile and timer-default settings.
4. Found and handled a conflict: hash routing plus Supabase's default auth flow. Switched to PKCE (D13) and added handling for auth errors that arrive in the URL hash.
5. Docs in this repo updated: decisions, web plan, roadmap, README, changelog.

### Deployed (user ran these from Termux on Android)
- `focus-web` pushed to `harsha-maloth/focus-web` (public). Lockfile generated on the phone with `npm install --package-lock-only` and committed.
- GitHub Pages enabled with source GitHub Actions; the deploy workflow ran and the site is live at `https://harsha-maloth.github.io/focus-web/`.
- Supabase project created; `0001_init.sql` ran without errors in the SQL editor. Auth Site URL and Redirect URLs set to the Pages URL.
- Email magic-link sign-in confirmed working end to end.
- Google sign-in postponed; not configured yet.

### Problem found after deploy: blank page
The live site was blank until the two repo variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) were added. Cause: an unset GitHub variable reaches the build as an empty string, and `supabase.ts` only handled `undefined` (`??`), so the Supabase client threw on load instead of showing the "Connect Supabase" notice. Fix: use `||` so empty values count as unset. Applied in the assistant's copy of the repo; the user should confirm it is also in the pushed repo (`grep -n "||" web/src/lib/supabase.ts`).

Note: the assistant's copy of `focus-web` does not contain the `package-lock.json` created on the phone. The pushed repo on GitHub is the source of truth. When sending updated code, copy over files rather than replacing the whole folder, or run `git pull` first.

### Not verified (still)
- Full TypeScript check, tests and pgTAP database tests were not run by the assistant (no network or Postgres in its environment). The GitHub Actions run runs typecheck, tests and build, so a green deploy covers those three. pgTAP tests (`supabase test db`) remain unrun.
- Settings save and the new-user trigger are expected to work but were not confirmed by the user yet.

### Open items
- Confirm Settings saves (name, time zone, timer defaults) and Home shows the new default length.
- Confirm the `||` fix is pushed.
- Google sign-in: create the OAuth client, enable the provider in Supabase (README step 3 in `focus-web`).
- Phase 2: timer UI driven by server timestamps, tags CRUD, distraction tracking, sound and notification on end, history. No pause (D14).
- Check that the name "Focus" is free as a domain and on the Play Store.
- Android: scaffold the project, decide package id and branding.

### Corrections after Session 3
- The `||` blank-page fix was **not** in the pushed code; it was applied in Session 3 (see below).
- The "Open items" above that mention Phase 2 as next are out of date: the Phase 2 and 3 code and migrations 0002 to 0004 already existed when Session 3 reviewed the repo.

---

## Session 3: 2026-10-10

### Goal
Read everything, merge the planning repo into `focus-web`, review the code, and rewrite the docs so they match what exists.

### Done
1. Read both uploads: the planning repo (`focus`: docs and git history) and the active repo (`focus-web`: code, migrations, tests, workflow).
2. Found that the planning docs lagged the code. `focus-web` already had: Phase 2 (timer, tags, distraction log, break timer, recent sessions), Phase 3 (stats, streaks, milestones, chart), migration 0002 (time zone flag, stale sessions), 0003 (stats), 0004 (heartbeat presence, away time, server time zone list).
3. Merged the planning repo into `focus-web` (`docs/`, root `CHANGELOG.md`, merged `.gitignore`). Recorded as D15, superseding the two-repo split in D9. Raised the privacy consequence: research notes about modded APKs are now in a public repo (structure only, no APKs or code).
4. Reviewed the code by reading. Nothing was executed (no network, no Postgres). Full findings in `code-review.md`. One real bug: `supabase.ts` still used `??`, so an empty variable crashed the app on load. Fixed with `|| undefined`.
5. Rewrote the docs: root `README.md`, `docs/README.md`, `roadmap.md`, `web-plan.md` (phase status and an "as built" section), `decisions.md` (D16 to D21 for choices that were in the code but unrecorded), `architecture.md` (web section added), `glossary.md`, `commands.md`, `CHANGELOG.md`, and this log.

### Inferred, not witnessed
Sessions 1 and 2 are logged from their own entries. The existence and design of 0002 to 0004 and the Phase 2 and 3 code are taken from the files themselves. This log does not say when or in which session they were written, or whether they have been applied to Supabase or deployed.

### Update later in Session 3
User confirmed migrations 0002, 0003 and 0004 are applied to the Supabase project. Logged in `ops-log.md`, `CHANGELOG.md`, `roadmap.md`, `web-plan.md`, `code-review.md` and the README status.

### Health check result (later in Session 3)
I wrote `supabase/checks/health_check.sql` (read-only). The first version failed in the SQL editor (`42601`, probably the comment lines); the comment-free version ran. Result: 21 PASS, 0 FAIL, 5 info. Confirms: 6 tables with RLS, migration 0002 and 0004 columns, all 12 functions with the 0004 bodies of `start_session` and `end_session`, anon cannot run any function or touch any table, clients cannot write sessions, events or milestones, 4 triggers, unique running-session index, 598 time zones. Data: 2 users each with a profile and settings, 7 sessions (5 abandoned, 2 completed), 2 milestones, no stale or over-credited sessions.

### Stats page checked in the browser (later in Session 3)
User pasted the live Stats page: Today 5 min, this week 5 min (nothing last week), this month 5 min, streak 1 day (longest 1), 30-day chart, time zone Asia/Calcutta, by tag Testing 5 min 92% and No tag 0 min 8%, one milestone (First session completed, 10 Oct), 2 completed sessions and 5 min in total. Conclusions: Phase 3 works end to end; the new-user trigger and first-load time zone setting work; tags are recorded on sessions. Found: the chart's "30 min" is its scale and reads like a total (UI fix applied afterwards: label now "scale: 30 min" and the real 30-day total shown under the chart; not yet seen live). The apparent milestone mismatch was resolved: a per-account query shows two accounts, both named Harsha, each with 1 milestone (completed 2 and 1, abandoned 2 and 3). The completed total rose from 2 (health check) to 3, so another session finished afterwards (inferred, not seen). Display names are not unique; keep in mind for leaderboards.

### Pushed (end of Session 3)
User copied the merged files into `~/focus-web` on Termux, committed and pushed. Deploy ran and the user reports it works, so the `||` fix, the chart label change and the docs are live. Lesson: with several downloaded zips, select by content (grep for a marker) rather than by name.

### Not verified
- Browser behaviour: Settings form save, creating a tag in the UI, and a 1-minute session finishing cleanly. Stats is verified.
- Auth dashboard settings (Site URL, Redirect URLs, Google provider) and the GitHub Actions variables: SQL cannot check these.
- Typecheck, vitest and build (CI covers them on push).
- pgTAP tests: 53 assertions, never run.
- Settings save, the new-user trigger, the timer and stats on the live site.

### Open items
1. ~~Push the merged repo~~ Done from Termux. The user picked the right zip by checking for the chart fix before copying (a stale zip had been selected first). Deploy succeeded; user reports it works.
2. ~~Apply 0002, 0003, 0004~~ Done.
3. Hand-test the rest of the live site: save Settings, create a tag, run a 1-minute session, check Recent sessions and Stats.
4. Run `supabase test db`.
5. Configure Google sign-in.
6. Phase 4: sound and notification at the end, wake lock, history page, zen mode, PWA (self-host the font).
7. Decide whether the research notes stay public (D15).
8. Check that the name "Focus" is free (domain, Play Store).
9. Android: scaffold the project, choose a package id.

### Context block (paste into a new AI session)

```
Project: Focus. One public repo, harsha-maloth/focus-web (research, docs and code together; the old private planning repo was merged in, D15).
Web app: Vite + React 19 + TypeScript, hash routing, TanStack Query, Supabase (Auth: magic link live, Google code written but provider not configured, PKCE; Postgres with RLS; RPCs for server-timed sessions). Live at https://harsha-maloth.github.io/focus-web/.
Built (written): timer with heartbeat presence (80% verified presence to complete), tags, distraction log, break timer, recent sessions, stats/streaks/milestones in Postgres, settings, delete account. Migrations 0001 to 0004. Migrations 0001 to 0004 are applied and the read-only health check passed 21/21 (2 users, 7 sessions, 2 milestones). Browser behaviour of Phases 2 and 3 not hand-checked. pgTAP tests (53) never run.
Not built: sound/notifications, wake lock, zen mode, PWA, history page, groups and leaderboards, Android app (research only).
Docs: README.md, docs/README.md (index), docs/roadmap.md, docs/web-plan.md, docs/code-review.md, docs/decisions.md (D1 to D21), docs/ai-log.md.
Rules: clean-room (reference apps studied for structure only, nothing copied); never use the Supabase service_role key; RLS on every table; sessions written only through RPCs using server time.
User: harsha-maloth on GitHub; works mostly from an Android phone (Termux) and also Windows + PowerShell; IST timezone; prefers short copy-paste commands.
```



---

## Session 4: 2026-10-10

### Goal
Fix the issues listed in `code-review.md`.

### Done
Fixed review items 4, 5, 9 and 10 in the web app (see `CHANGELOG.md`, Session 4). Added unit tests for `isNotReachedError` and `ranFullLengthUnverified`.

### Not verified
Typecheck, vitest and build were not run: `npm ci` failed here (registry unreachable). Run `npm test` and `npm run typecheck` locally or let the deploy workflow do it, then hand-check the timer and Settings.

### Left open (not fixable in code now)
pgTAP never run (item 2); hand test of Settings, tags and a 1-minute session (item 3); no sound, wake lock, zen, PWA or history page (item 6); faked heartbeats (item 7, a design limit for Phase 5); deletable own sessions (8); Google Fonts self-hosting (11, needs network to fetch the font files); Supabase free-tier pausing (12).

### Session 4b: Phase 4 (later the same day)
Goal: build what remained of Phase 4. Done: end sound, notifications (per device), wake lock, zen mode with ambient noise, history page, PWA shell (manifest, icons, service worker, install button), Google Fonts removed (D22), reduced-motion rule. Details in `CHANGELOG.md`.
Not verified: nothing was run in a browser. `npm install` crashes in this workspace, so only `audio.ts`, `notify.ts` and `timer.ts` were typechecked (tsc directly). The React files, the service worker and vitest are unchecked until the deploy workflow runs. Possible problems to look for: TypeScript errors in `TimerPanel.tsx`, `SettingsPage.tsx`, `HistoryPage.tsx`; service worker caching an old build after a deploy (navigations are network-first, so a refresh should fix it); the fonts now look different.
Context block addition: Phase 4 is written (sound, notifications, wake lock, zen, history page, PWA shell); Session 4 review fixes are live and the user reports the site works.


---

## Session 5: 2026-10-10

### Goal
Restyle the web app in an app-like look (studied from a reference Android app, structure only) using Focus colours; user chose a bottom tab bar.

### Done
Phases 1 to 3 of the plan: tokens, tab bar shell with hero header, icons, theme colour (see `CHANGELOG.md`, Session 5, and D23).

### Not verified
Nothing was run: no node_modules or network here, so typecheck, vitest and build are unchecked (CI will run them). Not seen in a browser: check a 360 px phone width in light and dark, the tab bar over the gesture bar, zen mode hiding the bar, and the installed PWA.

### Open items
Phase 4 screens (Login, Home hero, History rows, Stats cards, Settings and tag bottom sheets), Poppins files in `web/public/fonts`, skeletons and snackbar, then contrast check.


### Session 5b (same day)
Done: hero titles in the phone header, login restyle, session row cards with status dots, `greeting.ts` plus tests (see `CHANGELOG.md`, Session 5b). Not verified: nothing run or seen. Check: greeting uses the profile time zone; login text readable in light and dark; hidden h1 on phones; theme-color restores after login.
Left: Stats cards, Settings and tag bottom sheets, snackbar, skeletons, Poppins files, contrast check.


### Session 5c (same day)
Done: BottomSheet, tag add/edit in a sheet, Stats and Settings panels (see `CHANGELOG.md`, Session 5c). Not verified: nothing run or seen. Check: sheet opens, closes by Escape and backdrop, saves a tag, covers the tab bar, keyboard focus returns to the Add tag button.
Left: snackbar, skeleton loading, Poppins files, contrast check, History filter styling, zen mode polish.


### Session 5d (same day)
Done: snackbar and skeleton loading (see `CHANGELOG.md`, Session 5d). Not verified: nothing run or seen. Check: the snackbar shows after a session ends, a Settings save and a tag change; sits above the tab bar; skeletons show on a slow load; reduced motion stops the shimmer.
Left: Poppins files, contrast check (light and dark), History filter styling, zen mode polish, then hand-test the whole phone flow.


### Session 5e (same day)
Done: contrast pass (accent darkened in light mode, snackbar edges per mode), History status chips, zen polish (see `CHANGELOG.md`, Session 5e). Not verified: nothing run or seen.
Left: Poppins files, deploy and walk the whole phone flow by hand (login, timer, zen, tags sheet, snackbar, History filters, install PWA), then fix what the walk finds.


### Session 5f (same day)
Done: Poppins wiring with graceful fallback (D24). The font files are still to be added by the user. Not verified: nothing run or seen.
Left: add the font files; deploy; hand-walk the phone flow; fix what that finds. The planned UI phases (1 to 4) are all written.


---

## Session 6: 2026-10-10

### Goal
Read the whole Phase 4e zip, then plan a full UI/UX change.

### Done
Read all docs, migrations, tests and app code (nothing executed). Proposed a 6-step redesign; the user chose "bold and app-like". Wrote D25, `web-plan.md` section 14, a roadmap row, and fixed two stale doc references. Docs only, no code.

### Noticed, not fixed
Service worker cache name never bumps and non-hashed files are cache-first; docs `architecture.md`, `web-plan.md` sections 9 and 13 and the earlier context block still describe the pre-Phase-4 state; `ops-log.md` Google provider row has a `?` date; Stats "By tag" heading does not say it covers 30 days.

### Not verified
Nothing run. Sessions 5 to 5f UI still unseen in a browser.

### Open items
1. Add Poppins files, deploy, hand-walk the current UI (redesign step 0).
2. Then redesign step 1 onwards (`web-plan.md` section 14).
3. Earlier open items (Settings save, pgTAP, Google sign-in) still stand.

### Context block addition
Phase 4 and the Session 5 restyle are written (Phase 4 deployed, restyle unseen). A bold, app-like UI/UX redesign is planned (D25); no code changed yet.


### Session 6b (same day)
Started UI v2 step 2 (flows): the start sheet with presets and tag chips (see `CHANGELOG.md`, Session 6b). Not verified: nothing run or seen; only a syntax-level tsc pass. Left: result screen, running view as the zen look, History inside Stats, onboarding, shared components, the rest of the screens. Redesign step 0 (hand walk of the current build, Poppins files) still needs the user's phone.


### Session 7: 2026-10-10
Goal: switch to the Android blocker, sideloaded (no Play Store), built without Android Studio.
Done: Android scaffold, usage-access flow and today's usage list, tests, CI workflow, D26 (see `CHANGELOG.md`, Session 7).
Not verified: nothing compiled or run. The first CI run will likely show small errors; fix from the log.
Open items: (1) push, read the first CI result, fix errors; (2) set the optional signing-key secret; (3) decide the final application id before first install; (4) install on the phone and check the usage list against the phone's own Digital Wellbeing; (5) next build step: Room tables and weekly view, then app limits with the accessibility service (step 3). Android 13+ restricted-settings onboarding is needed before step 3. Web app paused after UI v2 step 2 (start sheet).
Context block addition: Android app lives in `android/` (Kotlin, Compose, one module, sideloaded, built by `android.yml`). Written but never compiled.

Update (same session): the user confirmed the application id `app.focus.harsha`. Open item (3) is closed; wording that called it a placeholder was removed from `android/README.md`, `app/build.gradle.kts`, D26 and the changelog.


### Session 8: 2026-10-10
Goal: remove the web app and make the Android app the product; add Room and a weekly view.
Done: deleted `web/` and the Pages deploy workflow (D27); kept Supabase; archived web docs; added Room, KSP, `UsageSync`, `WeekMath`, 7-day strip UI and tests (D28); rewrote README, roadmap and indexes (see `CHANGELOG.md`, Session 8).
Not verified: nothing compiled or run. Google Maven was blocked in the workspace and no Android SDK exists there.
Open items: (1) push and read the first CI result, fix errors; (2) signing-key secret; (3) check numbers against Digital Wellbeing on the phone; (4) switch off GitHub Pages and review Actions variables (user, in `ops-log.md`); (5) step 2, app limits with the accessibility service.
Context block addition: the repo is Android-first. `web/` is gone (history only). `supabase/` is kept for later sync, applied but unused by the app. Android has Room (`daily_usage`), a 7-day view, and has never been built.


### Session 9: 2026-10-10
Goal: Android step 2, app limits with blocking.
Done: limits package, accessibility service, block activity, Room v2 migration, Limits tab, tests, D29 (see `CHANGELOG.md`, Session 9).
Not verified: nothing compiled or run; the first CI run (also for Session 8 code) has not been read yet.
Open items: (1) push, read CI, fix compile errors; (2) on the phone: usage access, allow restricted settings, enable accessibility, set a short limit and see the block; (3) edit-a-limit, warning before the limit, step 3 focus timer.
Context block addition: Android has a Usage tab (7-day view, Room `daily_usage`) and a Limits tab (`app_limit`, accessibility `BlockerService`, `BlockActivity`). Never built.


### Session 10: 2026-10-10
Goal: the user's screenshots showed 48 h 57 min in one day. Found and fixed the overcount (D30); Room 3 clears stored usage. Not compiled or run. Open: push and read CI; recheck numbers against the phone's Digital Wellbeing.


### Session 11: 2026-10-10
Goal: user asked to use Digital Wellbeing data. Not readable by apps; switched to the system's daily totals with the event maths as fallback (D31); Room 4 clears stored usage. Not compiled or run. Open: push, compare with the phone's screen-time screen.

