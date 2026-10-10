# Glossary

- **APK**: Android app package, a zip file.
- **dex**: compiled Android bytecode inside an APK.
- **JADX**: tool that decompiles dex files into readable Java.
- **IL2CPP**: Unity's way of compiling C# to native code.
- **Accessibility Service**: Android service that can observe the UI and act on it. Used for detecting the foreground app.
- **UsageStatsManager**: Android API for per-app usage data. Needs the user to grant usage access.
- **Foreground service**: long-running service with a persistent notification.
- **WorkManager**: Android library for reliable scheduled background work.
- **Room**: Android SQLite abstraction.
- **Hilt**: dependency injection for Android.
- **Overlay**: window drawn over other apps (needs the "display over other apps" permission).
- **OEM**: phone maker (Xiaomi, Samsung, etc.) that adds its own battery and permission rules.
- **Clean-room**: building something from observed behavior and public information, without copying the original's code or assets.
- **RLS (row level security)**: Postgres rules that decide which rows a user may read or write. On for every table here.
- **RPC**: a Postgres function the app calls through Supabase (`supabase.rpc(...)`). All session writes go through these.
- **Security definer**: a function that runs with its owner's rights, so it can write tables clients cannot. Each one here fixes `search_path` and checks `auth.uid()`.
- **Anon key**: Supabase's public API key. Safe in the browser only because RLS is on. The `service_role` key bypasses RLS and must never be in the repo or the app.
- **PKCE**: an auth flow where the login code comes back in the query string. Used because the hash is reserved for routes. A magic link therefore works only in the browser that requested it.
- **Magic link**: sign-in by clicking a link emailed to you.
- **Heartbeat**: a small call the open page sends every 30 s so the server can verify presence.
- **Presence**: the seconds of a session the server could verify through heartbeats (`present_seconds`). A session completes only with at least 80%.
- **Away time**: time between a `blur` event and the next `focus` (tab hidden). Subtracted from credit.
- **Stale session**: a session still running more than 5 minutes past its planned end; closed on the next start.
- **Migration**: a numbered SQL file in `supabase/migrations/` that changes the schema. Apply in order.
- **pgTAP**: the Postgres test framework used in `supabase/tests/database/`.
- **PWA**: a web app that can be installed and work offline. Planned for Phase 4.
- **Hash routing**: routes like `/#/stats`; needed because GitHub Pages cannot rewrite URLs.

