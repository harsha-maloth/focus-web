# Decisions

## D1: Name is "Focus" (2026-10-10)
Replaces the working idea of cloning a specific app. Branding, icon and mascot to be designed independently.

## D2: Clean-room approach (2026-10-10)
Reference apps are studied for structure only (what features exist, how modules are split). No code, strings, art, sounds, prompts, mascots or data files are copied. Reasons: copyright, store policy, and long-term ownership of the product.

## D3: Native Android with Kotlin and Compose (2026-10-10)
The core feature set (usage stats, accessibility, overlays, foreground services) needs deep Android APIs. Cross-platform stacks add friction without benefit for v1.

## D4: Feature-module architecture (2026-10-10)
One module per feature plus shared core modules. Keeps builds fast and features independently testable.

## D5: Reference APKs are not stored or installed (2026-10-10)
Both reference APKs were re-signed or modded builds from unofficial sources, which can carry malware. They stay out of the repo (`.gitignore`) and off real devices.

## D6: Defer risky features (2026-10-10)
Short-form feed blocking, website blocking and device admin are post-MVP because of Play Store policy exposure.

## D7: Add a web track on GitHub Pages and Supabase (2026-10-10)
The user wants a web version. A web page cannot see or block other apps, so the web app is a focus timer, tracker and community, not a blocker. The Android app stays the blocking product and can share the Supabase backend later. Full plan in `web-plan.md`.

## D8: Server-side session timing (2026-10-10, accepted and implemented in 0001_init.sql)
Session start and end are set by Postgres functions using server time, so leaderboards cannot be faked from the client.

## D9: Two repos (2026-10-10, superseded by D15)
`focus` (private) keeps research, AI log, Android plans and decisions. `focus-web` (public) holds the web app and Supabase migrations, because free GitHub Pages needs a public repo and the research notes concern modded APKs. No secrets in either.

## D10: React for the web app (2026-10-10)
Vite + React + TypeScript, hash routing, TanStack Query. Chosen for ecosystem size. Delegated to the assistant by the user.

## D11: Sign-in is email magic link plus Google (2026-10-10)
GitHub login is not offered. Can be added later in the Supabase dashboard.

## D12: Default github.io URL (2026-10-10)
No custom domain for now. The app URL is `https://<user>.github.io/focus-web/`; Vite `base` follows the repository name in the deploy workflow.

## D13: PKCE auth flow because of hash routing (2026-10-10)
Supabase's default implicit flow returns tokens in the URL hash, which collides with hash routes. The client uses `flowType: 'pkce'` so the login code arrives in the query string. Trade-off: a magic link only works in the browser that requested it. Auth errors, which still arrive in the hash, are caught before the router mounts.

## D14: Pause is out of scope for the first timer (2026-10-10)
`session_event_type` has only `blur` and `focus`. Pausing needs separate server-side accounting; add it as its own decision before Phase 2 extends the timer.

## D15: One repo, `focus-web` (2026-10-10)
The planning repo (`focus`) was folded into `focus-web` so there is a single place for code, docs and logs. Supersedes the two-repo split in D9. The old `focus` repo is archived and no longer updated. Consequence: the research notes now sit in a public repo, so they contain structure and platform facts only, never APKs, extracted code or assets (see `.gitignore` and the clean-room rule in D2).

## D16: Presence is verified by heartbeat (2026-10-10, migration 0004)
Without proof of presence, a script could start a session, wait, and call `end_session` for full credit. The open page sends `session_heartbeat` every 30 s; the server counts a gap between beats only if it is 90 s or less. A session is `completed` only with at least 80% verified presence (`presence_required()`, one place to change). Otherwise it is stored as `abandoned` with the verified time. Honest limit: a script can fake heartbeats. This raises the cost of cheating, it does not remove it.

## D17: Credited time is span minus the larger of unverified and away time (2026-10-10, migration 0004)
Away time (blur to focus) no longer counts as focused. It is not added to unverified time, because a phone that suspends the page while you are away would be penalised twice for the same minutes. `session_credit()` implements it.

## D18: The server owns the time zone list (2026-10-10, migration 0004)
`timezone_names()` returns exactly the names the profile trigger accepts, so the app never offers a zone the database rejects. The browser's list is only a fallback. `profiles.timezone_confirmed` (0002) stops the app overwriting a deliberate choice, including UTC.

## D19: The timer counts down against server time (2026-10-10)
The client measures its offset from `server_time()` once and computes remaining time from `started_at` on every tick. Ticks are never counted, so background throttling and a wrong device clock do not change a session's length.

## D20: Stale sessions are closed on the next start (2026-10-10, 0002 then 0004)
A session running more than 5 minutes past its planned end is closed by `start_session`. It keeps only verified time: `completed` if that reaches the presence bar, otherwise `abandoned`.

## D21: Stats rules (2026-10-10, migration 0003)
Days use the profile time zone and the day a session started. Time counts from completed and abandoned sessions. A streak day needs at least one completed session, and a streak stays alive if the last such day was yesterday. Weeks start on Monday. Numbers come from `my_stats()` in Postgres; `award_milestones()` is the only writer of milestones.

## D22: Sounds are generated, fonts are system fonts (2026-10-10)
End sound and ambient noise come from the Web Audio API, so there are no audio files to license or cache. Notifications are an opt-in stored on the device, since browser permission is per device. The Google Fonts links were removed so the page makes no request to Google and works offline; the system font stack in `--font` applies. To get the old look back, self-host the Bricolage Grotesque files in `web/public/fonts` and add an `@font-face` rule.

## D23: App-style look, in Focus colours, with a bottom tab bar (2026-10-10)
Visual direction taken from a studied reference app (layout ideas only, clean-room, D2): a solid coloured hero header, flat white cards, pill shapes, bottom sheets, snackbars, skeleton loading. Colours stay Focus's own: teal `--primary` for the red of the reference, `--ink` for its black, `--accent` orange for emphasis only (white on orange fails contrast for small text). New tokens: `--tint`, `--success`, `--header-bg/ink`, `--radius-sm/card`. On phones (under 720 px) navigation is a bottom tab bar (Home, History, Stats, Settings) and the top bar becomes a hero header; wide screens keep the top bar. Chosen over a side drawer for one-thumb use. Headings will use self-hosted Poppins once the font files are added (D22 still holds: no requests to Google). Browser `theme-color` and the manifest now use the header colour.

## D24: Poppins for headings and buttons, self-hosted (2026-10-10)
Replaces the Bricolage Grotesque idea in D22. `web/public/fonts/fonts.css` declares Poppins 600 and 700 with `font-display: swap`; the two `.woff2` files are added by the user (they could not be downloaded in the workspace). `--font-display` is `'Poppins', <system stack>`, used for headings, buttons, chips, stat values and the ring time; body text stays on the system font. Until the files exist the app falls back to the system font and nothing breaks. The stylesheet is a plain static file, not processed by Vite, so a missing font file cannot fail the build, and the page still makes no request to Google (D22). Poppins is under the SIL Open Font License: keep `OFL.txt` beside the files.

## D25: UI/UX redesign, bold and app-like (2026-10-10)
The user chose "bold and app-like" for a full UI and UX pass. D23 already set that direction (solid teal hero header, flat cards, pills, bottom sheets, bottom tab bar), so D25 extends D23 rather than replacing it. What changes is flow and structure, not the palette.
- Keep the Focus tokens from D23 (teal `--primary`, `--ink`, orange `--accent` for emphasis only) and Poppins for headings (D24). No new colours without a contrast check.
- Home becomes the timer: large ring, one primary action. Minutes presets (15, 25, 45, custom) and tag chips open from a start sheet instead of a number input and select.
- The running view is the zen look by default; the separate zen mode becomes "hide the chrome".
- A real end-of-session result screen that says plainly whether the time counted or was not verified.
- Tabs stay four, but History moves into Stats as a segment, which frees a slot for Groups in Phase 5.
- First-run onboarding in 3 steps: the honest-time rule, time zone, first tag.
- Shared components first (button, chip, card, sheet, row, empty and error states), then each screen, shipped and hand-checked one at a time. This also splits the 1,447-line `index.css`.
- Trade-off: Phase 5 (social) waits. Nothing from Sessions 5 to 5f has been seen in a browser, so Phase 0 of the redesign is a hand walk of the current build.

## D26: Android app is sideloaded, built in GitHub Actions, scaffold kept small (2026-10-10)
The web app is paused after the first UI v2 step (D25) and work moves to the Android blocker, the original goal (D3).
- **Distribution:** APKs only, not Google Play. So the Play policy limits on accessibility, overlays and package visibility do not apply, but sideloading has its own problems: Android 13+ "restricted settings" for accessibility (onboarding must explain it), Play Protect warnings, and updates only install over a build signed with the same key.
- **Build:** no Android Studio. `.github/workflows/android.yml` runs unit tests and `assembleDebug` on GitHub and uploads the APK as an artifact. No Gradle wrapper yet (the setup action installs Gradle 8.9). An optional secret `ANDROID_DEBUG_KEYSTORE_BASE64` keeps one signing key so updates install over old builds.
- **Scaffold kept small:** one `app` module, Compose and Material 3 only. Hilt, Room and the feature-module split from `architecture.md` wait until a step needs them (Room arrives with persisted limits in step 3). Fewer moving parts means fewer first-build failures when nothing can be compiled locally.
- **Permissions:** only `PACKAGE_USAGE_STATS` plus a launcher-apps `<queries>` entry. No INTERNET yet, so nothing leaves the phone. No `QUERY_ALL_PACKAGES`.
- **Application id** `app.focus.harsha`, confirmed by the user 2026-10-10. Permanent: it cannot change after the first install without breaking updates.
- **Look:** same colour tokens as the web app, dark teal hero header with the total, flat cards.

## D27: Remove the web app; Android is the product (2026-10-10)
Supersedes D7, D10 to D14, D22 to D25 for new work (the records stay as history). The user decided to drop the web app and focus on the Android app, the only place app blocking is possible.
- `web/` and `.github/workflows/deploy.yml` are deleted; git history keeps them. The `docs-check` reminder now watches `android/`, `supabase/` and workflows.
- **Supabase is kept** (`supabase/`, migrations 0001 to 0004, applied). The Android app can later sign in and sync sessions with `source = 'android'`. Nothing in the app uses it yet and the app still has no INTERNET permission.
- Web docs (`web-plan.md`, web parts of `architecture.md` and `code-review.md`) are kept but marked archived.
- The repo is still named `focus-web`; renaming it is the user's call (it changes the clone URL; the Pages URL goes away anyway).
- Left to do outside git: switch off GitHub Pages and decide whether to drop the Actions variables `VITE_SUPABASE_*` (logged as open in `ops-log.md`).

## D28: Room stores daily usage; the system log is only the source (2026-10-10)
Android keeps usage events for only a few days, so the app copies each day into Room (`daily_usage`: date, package, label, ms) and reads the 7-day view from there. A fresh read only overwrites a stored day if it is non-empty and at least as large (`WeekMath.shouldReplace`), so purged system data can never wipe history. KSP and Room 2.6.1 were added; this is the first dependency beyond Compose, and it has not been compiled yet. Known limit: an app open across midnight loses its pre-midnight part on the new day.

## D29: Block with a full-screen activity from an accessibility service (2026-10-10)
Limits are enforced by `BlockerService`, an accessibility service that listens only for window-change events (no window content, no text; `canRetrieveWindowContent=false`). When the app in front has a limit and today's usage (read from the system log, so the open session counts) has reached it, the service starts `BlockActivity`, a full-screen "Time's up" page. Chosen over a draw-over-apps overlay because it needs no `SYSTEM_ALERT_WINDOW` permission and cannot be tapped through. The service re-checks the front app every 30 s so an app that crosses its limit while open is still caught. Never blocked: Focus itself (so limits can be changed) and System UI. Room moved to version 2 with a real migration (adds `app_limit`, keeps usage history). Sideloading means Android 13+ "restricted settings" must be allowed by hand; the README explains it. Trade-offs: the app can flash for a moment before the block appears, and battery savers on some phones kill the service (step 4).

## D30: Usage maths uses one foreground app at a time (2026-10-10)
Replaces the per-activity pairing in `UsageAggregator`. The phone showed 48 h in a day because activities with a missing pause event ran to the end of the window and stacked. Now a resume closes the previous app, a pause closes only the current app, and screen off, lock screen and shutdown close everything. Cost: split-screen time goes to the last app resumed. Room moved to version 3 and clears `daily_usage` so the bad history does not survive the "only replace with a larger value" rule.

## D31: Usage comes from the system's daily totals, events as fallback (2026-10-10)
Supersedes the source choice in D30 (the one-app-at-a-time event maths stays as the fallback). Digital Wellbeing's own data is not readable by apps, so `queryUsageStats(INTERVAL_DAILY)` is used: the system does the pairing, the app keeps only the bucket starting at local midnight and caps each app at the window. Room 4 clears stored days. Limits use the same numbers.

## D32: Focus sessions are local-first, blocked by the existing accessibility service (2026-10-10)
Answers the open question about the Android timer. Sessions are stored in Room (`focus_session`: start, planned, end, status running, completed or ended_early) and timed from the phone clock; the Supabase server-timed functions are not used yet, so there is no network and no heartbeat. Changing the clock can cheat a session; accepted until sync exists. There is no foreground service: the timer is computed from the stored start time, the Focus screen ticks while open, and `BlockerService` also marks a session completed when it sees one past its end. During a session `BlockerService` blocks any app not on the allowed list (`allowed_app`), checked on every window change with no throttle. Never blocked: Focus, System UI, the home screen, enabled keyboards and the default dialer (`SystemPackages`), because blocking the keyboard would break typing in allowed apps. "End early" is the exit and asks for confirmation. Room is at version 5 with a real migration. Trade-offs: no notification or sound at the end yet, and the exit is easy by design.

## D33: Count usage ourselves with the accessibility service; system data is the fallback (2026-10-10)
Supersedes the source choice in D31 after the numbers were still wrong on the user's tablet. Two system sources (daily totals and the event log) are both unreliable on some phones, and the Digital Wellbeing app's data is not readable. The accessibility service already sees every window change, so it now feeds `LiveTracker`: one app in front at a time, screen off and home screen count as idle, keyboards, System UI and system dialogs do not change the front app, a recovery lookup runs after unlock, and a single credit is capped at 90 s so a frozen or killed service can never inflate a total. Credits are added to Room `live_usage` per day and app (Room 6). The Usage tab prefers live rows for a day and labels them; days without live data show the system estimate. Limits use live data when counting began before today's midnight. A "Check" line shows system totals, event log and day-so-far to diagnose a bad source. Trade-offs: no history before the service was switched on (the first live day is partial), time is lost while the service is not running, and a few seconds can be off per switch. Cost: Focus now stores which app was in front and for how long, on the phone only.

