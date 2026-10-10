# Focus for Android

Native Kotlin and Jetpack Compose. Sideloaded as an APK, not published on Google Play (D26).
Clean-room: written independently, nothing taken from any reference app (D2).

## What it does so far (version 0.1.0)
- Asks for **Usage access** (Settings, Special access), then lists screen time per app.
- Shows the last 7 days as bars; tap a day to see its apps. Each day is saved on the phone in a Room database (D28), so history outlives the system's short event log.
- Has no INTERNET permission: nothing leaves the phone.
- Not built yet: app limits, blocking, overlay, focus sessions, Supabase sync (see `docs/roadmap.md`).
- Nothing here has been compiled yet (including the Room and KSP setup); expect small fixes from the first CI run.

## Build without Android Studio
1. Push to `main`. The workflow `.github/workflows/android.yml` runs the unit tests and builds the APK.
2. Open the run on GitHub: Actions, "Android APK", the latest run, Artifacts, `focus-debug-apk`. Download the zip and unzip it.
3. Copy `app-debug.apk` to the phone and open it. Allow "install unknown apps" for the app you opened it from.
4. Play Protect may warn about an app from outside the store. Choose "Install anyway".
5. Open Focus, tap "Open settings" and turn on usage access for Focus.

If the build fails, open the failed step in the run and send the red lines. Nothing in this folder has been compiled yet.

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
    usage/    UsageAggregator, WeekMath (pure, tested), UsageRepository (system calls), UsageSync
    data/     FocusDb (Room: daily_usage)
  app/src/test/...                JUnit tests for the pure parts
```

## Application id
`app.focus.harsha`, confirmed by the user on 2026-10-10. It is permanent once a build is installed: changing it later makes Android treat the app as a different one, so updates stop installing over the old copy.
