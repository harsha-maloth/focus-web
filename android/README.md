# Focus for Android

Native Kotlin and Jetpack Compose. Sideloaded as an APK, not published on Google Play (D26).
Clean-room: written independently, nothing taken from any reference app (D2).

## What it does so far (version 0.1.0)
- Asks for **Usage access** (Settings, Special access), then lists screen time per app.
- **Live counting:** once the accessibility service is on, Focus counts foreground time itself (which app is in front, minus screen off, home screen, keyboard and system windows) and stores it per day on the phone. Days with live data say "Counted live by Focus"; older days say "System estimate". The Usage tab also prints a "Check" line comparing the system's totals, the event log and the day so far, so a wrong source is easy to spot.
- Shows the last 7 days as bars; tap a day to see its apps. Each day is saved on the phone in a Room database (D28), so history outlives the system's short event log.
- **Focus tab:** pick 15, 25, 45, 60 or 90 min and start a session. While it runs, every app except Focus, the phone app, the keyboard, the home screen and the apps on your "Allowed during a session" list is blocked with a "Stay focused" page. The timer finishes by itself; "End early" asks first and saves the time so far. Recent sessions are listed. Uses the same accessibility switch as limits.
- **Limits tab:** pick an app and a daily limit (15 to 120 min). An accessibility service watches which app comes to the front; once today's use reaches the limit, a full-screen "Time's up" page opens over it (Back or "Go home" returns to the launcher). It resets at midnight.
- Has no INTERNET permission: nothing leaves the phone.
- Not built yet: timer notification and end sound, schedules, reboot recovery checks, Supabase sync (see `docs/roadmap.md`).
- Nothing here has been compiled yet (including the Room and KSP setup); expect small fixes from the first CI run.

## Build without Android Studio
1. Push to `main`. The workflow `.github/workflows/android.yml` runs the unit tests and builds the APK.
2. Open the run on GitHub: Actions, "Android APK", the latest run, Artifacts, `focus-debug-apk`. Download the zip and unzip it.
3. Copy `app-debug.apk` to the phone and open it. Allow "install unknown apps" for the app you opened it from.
4. Play Protect may warn about an app from outside the store. Choose "Install anyway".
5. Open Focus, tap "Open settings" and turn on usage access for Focus.

If the build fails, open the failed step in the run and send the red lines. Nothing in this folder has been compiled yet.

## Turning blocking on (once)
1. Limits tab > "Open usage access" and allow Focus (same switch as the Usage tab).
2. Android 13 and newer greys out Accessibility for sideloaded apps: Settings > Apps > Focus > three dots > **Allow restricted settings**.
3. Limits tab > "Open accessibility" > Focus > turn on. Android shows a warning; Focus reads only which app is in front, no screen content (`res/xml/blocker_service.xml`).
4. Add a limit. Test with a short one (15 min on an app you have already used for longer): opening it should show "Time's up".

Known limits: the session timer uses the phone clock, so changing the clock can cheat it (a later Supabase sync would use server time); it can only react after the app opens (a flash of the app is possible); some phones kill the service to save battery (reliability work is step 4); an app open across midnight loses its pre-midnight time on the new day.

## Keep updates installable (recommended, one time)
Android only installs an update over an app signed with the same key. Without a stored key, each cloud build gets a new throwaway key, so you must uninstall before installing the next build.

To fix that, make one debug key and store it as a GitHub secret (Termux: `pkg install openjdk-17`):
```
keytool -genkeypair -keystore debug.keystore -storepass android -alias androiddebugkey -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
base64 -w0 debug.keystore
```
Copy the long output into Settings, Secrets and variables, Actions, **Secrets**, name `ANDROID_DEBUG_KEYSTORE_BASE64`. Keep `debug.keystore` somewhere safe and never commit it (`.gitignore` blocks `*.keystore`).

## Layout
```
android/
  settings.gradle.kts, build.gradle.kts, gradle.properties
  app/build.gradle.kts            one module for now (D26)
  app/src/main/java/app/focus/harsha/
    MainActivity.kt
    ui/       Theme, Format, HomeScreen
    limits/   LimitMath, SessionMath (pure, tested), SystemPackages, BlockerService (accessibility), BlockActivity, InstalledApps, AccessibilityStatus
    usage/    LiveTracker (pure, tested), LivePrefs, UsageAggregator, WeekMath (pure, tested), UsageRepository (system calls), UsageSync
    data/     FocusDb (Room: daily_usage, live_usage, app_limit, focus_session, allowed_app)
  app/src/test/...                JUnit tests for the pure parts
```

## Application id
`app.focus.harsha`, confirmed by the user on 2026-10-10. It is permanent once a build is installed: changing it later makes Android treat the app as a different one, so updates stop installing over the old copy.
