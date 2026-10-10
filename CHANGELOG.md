# Changelog

Dates are 2026-10-10 for everything so far (the project began and reached Phase 3 the same day). Newest first.

## Session 13: count usage ourselves (written, not compiled)
- Usage was still wrong on the user's tablet with both system sources. New primary source: `BlockerService` counts foreground time live through `LiveTracker` (pure, 6 tests): one app in front, screen off and home screen are idle, keyboards, System UI and system dialogs are ignored, a screen-off receiver and an unlock recovery (`UsageAggregator.openAt`, `UsageRepository.lastForeground`), 30 s ticks, and every credit capped at 90 s so totals cannot run away.
- Room 6 with `Migration(5, 6)`: table `live_usage` (date, pkg, label, ms), `LiveUsageDao`. `LivePrefs` remembers when live counting started.
- `UsageSync.loadWeek` prefers live rows for a day (`UsageSummary.live`); the header says "Counted live by Focus" or "System estimate". Limits use live data when counting began before today's midnight.
- Usage tab shows a "Check" line: system totals, event log and day so far (`UsageRepository.diagnose`), to see which source is off. `SystemPackages` gained `overlays()` and `homes()`.
- Decision D33. Not run; nothing compiled or tried on a phone. Live counting starts only after the accessibility service is switched on, so today will be partial the first day.

## Session 12: focus timer (written, not compiled)
- New Focus tab (now the first tab): length chips (15, 25, 45, 60, 90), Start, big countdown in the header, "End early" with confirm, "Allowed during a session" list (app picker reused from Limits), Recent sessions (8). Warns when the accessibility service is off.
- Room 5 with `Migration(4, 5)`: tables `focus_session` and `allowed_app`, DAOs `FocusSessionDao` and `AllowedAppDao`. Earlier tables are kept.
- `BlockerService`: during a running session blocks apps not on the allowed list ("Stay focused" page with minutes left), no throttle; marks a session completed when past its end; limits check unchanged after it. It now ignores the home screen, keyboards and default dialer via `SystemPackages`. `BlockActivity` takes a title and message instead of an app label.
- New pure `SessionMath` with 5 tests (not run). Manifest `<queries>` gained the HOME intent.
- Decision D32. No notification, sound or foreground service yet; phone-clock timing.
- Not run: nothing compiled or tried on a phone.

## Session 11: use the system's own daily totals (written, not compiled)
- User asked to use the Digital Wellbeing data. Android has no public API to read that app's data. The closest source is the system's per-app daily totals (`UsageStatsManager.queryUsageStats(INTERVAL_DAILY)`), which is what screen-time screens draw on, so `UsageRepository.day` now uses it. The event-log maths (`foregroundMs`, Session 10) stays as a fallback when the system returns nothing.
- `UsageAggregator.fromBuckets` (pure): keeps the bucket that starts at the day's midnight, sums per app, caps each app at the window. 2 new tests. Not run.
- Room 3 to 4 clears `daily_usage` again so days computed the old way are replaced. Limits are kept.
- Expect small differences from the Digital Wellbeing app itself; compare on the phone.

## Session 10: fix wildly wrong usage totals (written, not compiled)
- **Bug (seen on the phone, 2026-10-10):** the screen showed 48 h 57 min for one day and 86 h on another, and WhatsApp 15 h in under 12 h of day. Cause: `UsageAggregator` paired resume and pause per activity, so any activity whose pause event was missing counted until the end of the day, and several of them stacked.
- **Fix:** one app in front at a time. A resume closes the previous app; a pause closes only the current app; screen off, lock screen and shutdown close whatever is open. Totals can no longer exceed the window.
- **Stored data:** Room 2 to 3 migration deletes `daily_usage` (the bad values would otherwise stay, because stored days are only replaced by larger values). History refills from the system log. Limits are kept.
- Tests: 4 new aggregator cases (unclosed activities, window cap, screen off, late pause). Not run.
- The same wrong numbers also fed the limits check, so limits could have blocked too early; fixed by the same change.

## Session 9: app limits (written, not compiled)
- New `limits/` package: `LimitMath` (pure, tested), `BlockerService` (accessibility service: window-change events only, 30 s re-check, never blocks Focus or System UI), `BlockActivity` (full-screen "Time's up", Back and button go Home), `InstalledApps`, `AccessibilityStatus`.
- Room version 2 with `Migration(1, 2)` adding `app_limit` (pkg, label, limitMs); `AppLimitDao`. Usage history is kept.
- UI: bottom tab bar (Usage, Limits). New `LimitsScreen`: setup card for the two permissions with the Android 13 restricted-settings steps, list of limits with used and blocked state, Add (app picker, then 15 to 120 min) and Remove. `HomeScreen` list no longer adds the nav-bar padding (the tab bar does).
- Manifest: `BlockActivity` (not in Recents), `BlockerService` with `BIND_ACCESSIBILITY_SERVICE`, `res/xml/blocker_service.xml`, service description string. Still no INTERNET and no overlay permission.
- Tests: new `LimitMathTest` (5 cases). Decision D29. Docs: android README ("Turning blocking on"), roadmap, AGENTS (next decision D30).
- Not run: nothing compiled or tried on a phone (no SDK or Google Maven in the workspace). The accessibility flow can only be proven on a device.

## Session 8: remove web, Android-first (written, not compiled)
- **Removed** `web/` (React app, PWA, tests, fonts) and `.github/workflows/deploy.yml`. Decision D27. Git history keeps them. `docs-check.yml` now watches `android/`, `supabase/` and workflows instead of `web/`.
- **Kept** `supabase/` untouched (migrations 0001 to 0004, health check, pgTAP). Marked web docs as archived (`web-plan.md`, `architecture.md`, `code-review.md`).
- **Android:** added Room (2.6.1) and KSP (2.0.21-1.0.28): `data/FocusDb.kt` (`daily_usage` table, DAO, database). `UsageRepository.day(date)` replaces `today()`. `UsageSync.loadWeek` copies the last 7 days into Room and reads them back; `WeekMath` (pure) holds `lastDays`, `shouldReplace` (a purged or shorter read never overwrites a fuller stored day) and `averageMs`. Decision D28.
- **UI:** `HomeScreen` shows a 7-bar strip under the header; tapping a bar shows that day's apps; the header shows a daily average.
- **Tests:** new `WeekMathTest` (5 cases).
- **Docs:** root README rewritten for Android-first; roadmap, docs index, android README, AGENTS (next decision is D29) updated.
- **Not run:** no Gradle build, no tests, no device. Google's Maven was unreachable from the workspace and there is no Android SDK, so even the compile is unchecked. Expect fixes from the first CI run.
- **Outside git, still to do (user):** switch off GitHub Pages; decide about the `VITE_SUPABASE_*` Actions variables (see `docs/ops-log.md`).

## Session 7: Android scaffold (written, never compiled)
- New `android/` project: Gradle (AGP 8.7.3, Kotlin 2.0.21, Compose BOM 2024.10.01, compile and target SDK 35, min 26), one `app` module, application id `app.focus.harsha` (confirmed by the user, final).
- Screen: usage-access permission card, then today's screen time per app (total in a teal hero header, flat cards with a bar). `usage/UsageAggregator.kt` pairs resume and pause events per activity (pure, unit-tested); `usage/UsageRepository.kt` reads the system log. Manifest: `PACKAGE_USAGE_STATS` and a launcher `<queries>` entry; no INTERNET.
- Tests: `UsageAggregatorTest` (6) and `FormatTest` (2).
- New workflow `.github/workflows/android.yml`: tests and `assembleDebug`, uploads `focus-debug-apk`. Optional secret `ANDROID_DEBUG_KEYSTORE_BASE64` for a stable signing key (names only; see `android/README.md`).
- Decision D26 recorded. Docs: `android/README.md`, roadmap, root README.
- Not run: nothing compiled (no Gradle or network here). XML files were parsed as valid XML; Kotlin was not checked. Expect to fix small build errors from the first CI run.

## Session 6b: start flow (UI v2, written, not run)
- Home: one big Start button plus a summary pill ("25 min · No tag"). Tapping the pill opens a sheet (`BottomSheet`) with minute presets 15, 25, 45, 60 or Custom, and tag chips (No tag plus each tag). The sheet has its own Start button. Files: `features/timer/TimerPanel.tsx` (`StartControls`, new `StartSheetBody`), `index.css` (`.start`, `.start-summary`, `.btn-lg`, `.chip-tag`).
- The stale-session view uses the same controls. The inline validation and tag hint on the idle view moved into the sheet.
- Not run: typecheck, vitest, build (no node_modules or network here). Only a syntax-level `tsc` pass on `TimerPanel.tsx` was clean. Not seen in a browser.
- Check: sheet opens and closes, a preset sets the length, Custom shows the number field, tag choice is remembered, Start closes the sheet and starts a session, focus returns to the pill.

## Session 6: UI/UX redesign plan (docs only)
- User chose "bold and app-like". Recorded as D25 (extends D23). Plan added as `docs/web-plan.md` section 14 and a "UI v2" row in `docs/roadmap.md`.
- Fixed stale doc references: next decision number in `AGENTS.md` (now D26), decision range in `docs/README.md` (D1 to D25).
- No code changed. Nothing run.

## Session 5f: Poppins wiring (written, not run; font files still missing)
- `web/public/fonts/fonts.css` (Poppins 600 and 700, swap, local() then url()), linked from `index.html`; `README.txt` lists the files to add and the OFL licence note. `--font-display` added; applied to headings, buttons, chips, stat values and the ring time. `--font` no longer lists Bricolage Grotesque (never loaded since D22).
- The two `.woff2` files are NOT in the repo: add `Poppins-SemiBold.woff2` and `Poppins-Bold.woff2` (and `OFL.txt`) to `web/public/fonts/`. Until then the system font is used.
- D24 records this. Not run; nothing seen in a browser.

## Session 5e: contrast pass, History chips, zen polish (written, not run)
- Contrast, computed from the token values (WCAG ratios; not checked on a screen): all text pairs in light and dark pass 4.5:1. Two findings fixed. (1) Light `--accent` `#f2542d` was 2.87:1 on the page background, under the 3:1 needed for the ring arc and chart bar; it is now `#e54f2a` (3.19:1 on the page, 3.62:1 on cards). Orange is still not used for small text. (2) Snackbar edge colours were nearly invisible in dark mode (1.5 to 2.1:1); they now use `--snack-info/success/error`, set per mode.
- Remaining known limit: the orange/teal tag colours chosen by the user are not checked; tag names are always shown as text beside the dot.
- History: the status filter is now a row of pill chips (All, Completed, Ended early / not verified) with `aria-pressed`; the tag filter stays a select, styled as a pill.
- Zen mode: larger ring, spaced uppercase caption, centred buttons with larger tap targets. Behaviour is unchanged.
- Not run: typecheck, tests, build; nothing seen in a browser.

## Session 5d: snackbar and skeleton loading (written, not run)
- New `components/Snackbar.tsx`: `SnackbarProvider` (in `App.tsx`, inside `AuthProvider`) and `useSnackbar()`. One message at a time, auto-dismiss after 5 s, Dismiss button, `role="status"`. Sits above the tab bar on phones; hidden in zen mode.
- Used for: session complete or ended (with verified minutes), Settings saved (replaces the inline "Saved."; errors stay inline), tag added, saved and deleted.
- New `components/Skeleton.tsx` (`SkeletonRows`, `SkeletonCards`): shimmering placeholders with one hidden "Loading…" announcement. Replace the plain "Loading…" text on History, Recent sessions and Stats. Settings and tags still show text. The shimmer is static under reduced motion (existing rule).
- Added a `.sr-only` utility class.
- Not run: typecheck, tests, build; nothing seen in a browser. Watch for TS narrowing on `sheet.kind` inside the new `onDone` closure in `TagsSection.tsx`.

## Session 5c: Stats panels, bottom sheet, tag sheet (written, not run)
- New `components/BottomSheet.tsx`: a modal sheet on the native `<dialog>` (browser handles focus trap, Escape, inert page). Slides up on phones, centred on wide screens; closes on backdrop click, the Close button or Escape. Content mounts only while open.
- Tags: add and edit now happen in the sheet (name, colour swatches from the palette plus a custom colour). The inline add form and inline edit form are gone; delete still confirms inline in the row. File: `features/tags/TagsSection.tsx`.
- Stats and Settings: sections and fieldsets are flat surface panels (`.panel`); stat cards get a 4 px teal edge, small-caps labels and a 2-column fit on phones.
- Not run: typecheck, tests, build; nothing seen in a browser. Watch for: `noUnusedLocals` complaints, `autoFocus` in the sheet, the sheet over the tab bar (the dialog sits in the top layer, so it should cover it).

## Session 5b: titles, login, session rows (written, not run)
- Phone hero header now carries the page title: a time-of-day greeting and the name on Home, the page name on History, Stats and Settings. The page `h1` stays for screen readers (class `page-title`, visually hidden on phones; `aria-hidden` on the header copy). New `lib/greeting.ts` (`greetingFor`, `hourIn`) with unit tests.
- Login on phones: art on top, teal panel pinned to the bottom with a light button (colours flip in dark mode); the field text stays dark on its light box. The wide layout is unchanged. The page sets the browser bar colour to the page background while it is open, and restores it on leave.
- Session rows (Home and History) are flat cards with a status dot: green for completed, orange for ended early or not verified.
- Not run: typecheck, tests, build; nothing seen in a browser.

## Session 5: app-style look, phase 1 to 3 (written, not run)
- Plan agreed: Focus colours in an app-style layout (D23). Bottom tab bar chosen over a drawer.
- Tokens added to `web/src/index.css`: `--tint`, `--success`, `--header-bg`, `--header-ink`, `--tabbar-h`, `--radius-sm`, `--radius-card` (light and dark).
- `Shell.tsx`: new hero header (`.appbar`) and bottom tab bar (`.tabbar`) for screens under 720 px; the old top bar stays on wide screens. Icons in `components/icons.tsx`. The tab bar is hidden in zen mode and respects the safe-area insets.
- `theme-color` (index.html) and `manifest.webmanifest` now use the teal header colour (light `#0b5563`, dark `#5cc2cf`). An installed copy must be removed and installed again to pick up the manifest change. The login page has no header yet, so its status bar colour will not match until phase 4.
- Not run: typecheck, tests, build (no node_modules or network here); nothing seen in a browser. CI will check types.
- Still to do: Poppins font files, hero titles per page, Login, History, Stats, Settings, bottom sheets, snackbar, skeletons.

## Session 4b: Phase 4 (deployed)
- Deployed after the typecheck fix: CI (typecheck, tests, build) passed and the user reports it works. The exact checks made (sound, notification, zen, History, install, offline) were not itemised.
- CI typecheck failed on `TimerPanel.tsx` (TS2774: `requestFullscreen` is always defined). The Full screen button now checks `document.fullscreenEnabled`. Not run; the next deploy will show.
- The installed PWA now opens full screen: manifest `display` is `fullscreen` (falls back to `standalone`), with safe-area padding on the top bar and page bottom so nothing sits under the notch or gesture bar. An already installed copy must be removed and installed again to pick up the manifest change. Not run or seen.
- Zen mode now always covers the whole window (100dvh, safe-area padding, page scroll locked) and stays open if the browser leaves full screen; a Full screen button re-enters it. Escape no longer closes zen; Exit zen does. The page, zen view and browser theme colour (`theme-color`, light and dark, and the manifest) all use the app background, so the top and bottom bars match. Not run or seen.
- Session 4 fixes were pushed (commit 85690f9) and the user reports the site works after the deploy; exact checks not itemised.
- Sound: end-of-session chime or bell, generated with Web Audio (no audio files). Setting stored in `user_settings.sound` (`none`, `chime`, `bell`). Test button in Settings. Files: `lib/audio.ts`, `SettingsPage.tsx`, `TimerPanel.tsx`.
- Notifications: opt-in per device (localStorage), shown only when the tab is hidden at the end of a session or break. `lib/notify.ts`.
- Wake lock: screen stays on during a session and a break, re-taken when the tab returns. `features/timer/useWakeLock.ts`.
- Zen mode: full-screen timer from the running view, with optional ambient brown or white noise (stored as `zen.ambient` in `user_settings.zen`). Escape leaves it.
- History page (`/history`): all finished sessions, 20 at a time, filter by status and tag. Home links to it. `SessionRow` is shared with the Recent list.
- PWA: `manifest.webmanifest`, icons (192, 512, maskable), `sw.js` offline shell (own origin only, Supabase calls never cached), "Install app" button where the browser offers it. The service worker registers only in the production build.
- Privacy: removed the Google Fonts links, so the page no longer contacts Google on load. The app uses the system font stack until a font is self-hosted (the workspace could not download font files). Closes review #11.
- Polish: reduced-motion rule, empty states on History.
- Added unit tests for `normalizeSound` and `readAmbient`.
- Not run: typecheck, vitest and build (npm install fails in the workspace). Only `audio.ts`, `notify.ts` and `timer.ts` were typechecked, with `tsc` directly. The deploy workflow will check the rest. Nothing was seen in a browser.

## Session 4: code-review fixes
- Fixed review #4: `TimerPanel.complete()` now retries on SQLSTATE `22023` (via `isNotReachedError` in `timer.ts`; `rpcEndSession` keeps the error `code`) instead of matching message text. No migration change.
- Fixed review #5: the running-timer view now tells the user to keep the page open and visible; hidden or sleeping time isn't verified.
- Fixed review #10: Recent sessions shows "Not verified" (with a tooltip) when a session ran to its planned end but lacked presence, and "Ended early" only for real early ends (`ranFullLengthUnverified`).
- Fixed review #9: `SettingsForm` is keyed on the profile time zone, so it remounts if the zone changes after the page mounted.
- Added unit tests for the two new helpers. Not run: `npm ci` failed in the reviewer's environment (registry unreachable), so typecheck and vitest are covered by the GitHub Actions run after push.

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
