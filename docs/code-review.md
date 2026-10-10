# Code review (2026-10-10)

Scope: everything in `focus-web` at the time of the merge: 4 migrations, the pgTAP file, the React app (auth, timer, tags, settings, stats) and the deploy workflow. Reviewed by reading. **Nothing was executed**: no network, no Postgres, no `npm ci` in the reviewer's environment. Typecheck, vitest and build are covered by the GitHub Actions run; the pgTAP tests have never been run.

## Verdict

The design is sound. All trusted logic sits in Postgres, clients cannot write sessions, events or milestones, and the security basics are in place. One real bug was found and fixed. The rest are gaps and small risks, listed below by priority.

## Fixed in this pass

| # | Finding | Fix |
|---|---|---|
| 1 | (Pushed and live 2026-10-10.) `web/src/lib/supabase.ts` used `??`. An unset GitHub variable arrives as `''`, so `createClient('')` threw on load and the page went blank instead of showing the setup notice. The 2026-10-10 log said this was fixed, but the fix was only in the assistant's copy. | Both values now use `|| undefined`. |

## Open, by priority

### Must check before relying on the live site (item 1 is resolved)
1. ~~Are migrations 0002 to 0004 applied?~~ **Resolved 2026-10-10:** the user confirmed they are applied. The frontend calls `session_heartbeat`, `timezone_names`, `my_stats` and `award_milestones`, which now exist. Still to do: a hand test (item 3).
2. **pgTAP tests never run.** (The 2026-10-10 health check covers structure, privileges and data, not behaviour, so this stays open.) `supabase test db` needs the CLI and Docker. The file declares `plan(53)` and contains 53 assertions, so the count is consistent, but behaviour is unverified.
3. **Phases 2 and 3 are mostly confirmed (updated 2026-10-10).** The Stats page was checked in the browser: totals, week comparison, streak, chart, tag breakdown and a milestone all render, and the profile time zone was set to Asia/Calcutta automatically. Not yet recorded: Settings form save, tag create in the UI, a clean 1-minute finish. Earlier evidence: The 2026-10-10 health check shows 7 sessions (5 abandoned, 2 completed), 2 milestones and a profile and settings row for each of 2 users. So the start, end and award functions and the new-user trigger have run on the live database. Still unrecorded: that Settings saves, that the Stats page renders correctly, and that a session finishes cleanly in the browser.

### Medium
4. ~~**Fragile error matching.**~~ **Fixed in Session 4 (not yet run or pushed):** retry now keys on SQLSTATE 22023. Original: `TimerPanel.complete()` retries only if the server message contains "not reached". If the SQL text in `end_session` is reworded, auto-complete stops retrying. Prefer matching on a stable SQLSTATE or `hint`.
5. ~~**Hidden tabs and phones.**~~ **Fixed in Session 4 (UI notice added; not yet run or pushed).** Original: Browsers throttle timers in background tabs, so heartbeats can be more than 90 s apart. That time is not credited, and an absence over about 20% makes a session finish as "Ended early" even when the countdown reached zero. This matches the design (leaving the tab is a distraction) but should be said in the UI, not only in the README.
6. ~~**Planned features missing.**~~ **Written in Session 4b (sound, notification, wake lock, zen, PWA shell, history page); not run or seen in a browser.** Original: No end-of-session sound or browser notification, no Screen Wake Lock, no zen mode, no PWA/offline shell, no full history page (the home page shows the last 8 sessions). The `sound` and `zen` settings columns exist but have no UI.
7. **Presence can be faked.** Documented in the README: a script can send heartbeats and skip blur events. Do not build leaderboards that trust these numbers without caps and abuse controls (Phase 5).

### Low
0. ~~Chart label reads like a total.~~ **Fixed 2026-10-10 (pushed; user reports the site works):** the label now says "scale: ..." and the hint shows the 30-day total. Original finding: The "30 min" at the top left of the Last 30 days chart is the vertical scale (minimum 30 min), not the 30-day total. On the live page, with 5 min focused in total, it looks wrong. Label it "scale: 30 min" or show the real total next to the heading (`DailyChart.tsx`).
0. ~~Milestone count vs page~~ **Resolved 2026-10-10.** There are two accounts, both with display name "Harsha", one milestone each. The health check counts all accounts. Not a bug. Note for the social phase: display names are not unique, so leaderboards must not rely on them.
8. **Own sessions are deletable** (`grant delete` on `focus_sessions`). Harmless for personal stats; decide whether leaderboards should read from an append-only copy.
9. ~~**Settings form can show a stale time zone.**~~ **Fixed in Session 4 (form keyed on zone; not yet run or pushed).** Original: If the shell sets the browser zone after the Settings page has mounted, the form keeps the old value and saving writes it back.
10. ~~**"Ended early" label.**~~ **Fixed in Session 4 (list shows "Not verified"; not yet run or pushed).** Original: A session whose timer ran out but lacked verified presence is stored as `abandoned` and shown as "Ended early", the same as giving up. The timer panel explains it once, the list does not.
11. ~~**Google Fonts**~~ **Fixed in Session 4b: links removed, system fonts used (D22).** Original: are loaded from Google's CDN (`index.html`). Mention it in the privacy note, and self-host the font when the PWA work starts so the shell works offline.
12. **Supabase free tier** pauses inactive projects. Check current limits before sharing the link widely.

## What is good (keep)
- Row level security on every table; `anon` has no table privileges; clients can update only named columns on `profiles` and `user_settings`.
- Every security-definer function sets `search_path = ''`, and helper functions are revoked from clients.
- Server time everywhere: sessions are timed by Postgres, and the client counts down against a measured server offset, so a wrong device clock changes nothing.
- Credit rule is explicit and tested: elapsed time minus the larger of unverified time and away time, capped at planned length.
- Stale sessions are closed on the next start without free credit.
- PKCE with hash routing, and auth errors are caught before the router mounts.
- No `service_role` key anywhere in the repo (checked with grep).
- Pure logic (`time`, `timer`, `timezone`, `stats`, `authErrors`) is split out and unit-tested.
