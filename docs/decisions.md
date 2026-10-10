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
