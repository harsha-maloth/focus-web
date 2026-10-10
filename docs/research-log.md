# Research Log

What was learned from studying reference apps. Structure and architecture only. Nothing here is copied code or content.

## Reference 1: BitLife (Unity game)

Source: `bitlife.zip` (modified APK, unofficial). Not stored in this repo.

| Area | Finding |
|---|---|
| Engine | Unity, IL2CPP. Logic in `libil2cpp.so`; metadata in `global-metadata.dat` |
| Java side | 17 dex files (~87 MB), almost all ad/analytics SDKs |
| Content | Unity asset bundles (`datapack.unity3d`, `data.unity3d`) plus localized text files |
| Monetization | Many ad networks, consent management, attribution, crash reporting |
| Verdict | Poor candidate for code-level study. Useful only for design observations (game loop, stats, events) gathered by playing |

Relevance to Focus: low. Kept for history.

## Reference 2: Regain (native Android focus app)

Source: `regain.zip` (modified APK, unofficial). Not stored in this repo.

### Tech stack observed
- Native Android, Kotlin (3 dex files, no Flutter/React Native/Unity).
- Room databases, WorkManager, Firebase (Analytics, Crashlytics, Performance, Remote Config), Lottie animations.
- Subscriptions via a billing SDK, product analytics SDKs, a logging library.

### App package layout (feature modules)

| Group | Modules |
|---|---|
| Blocking and control | app limit, block short-form feeds, block website, distracting apps, zen mode, productive mode |
| Focus | focus timer (largest module), focus schedules |
| Tracking | app usage stats, short-form scroll counter, phone lock/unlock counter, app category |
| Notifications | notification batching |
| Engagement | AI coach, invite flow, wall of love, onboarding, widget, floating bubble |
| Account and money | sign-in, subscription, theme |
| Infrastructure | workers, broadcast receivers, services, network, core, core analytics |

### How blocking works (inferred from class names)
- Monitor services use an Accessibility Service. Models for accessibility node info, node bounds and "short-form content present" show it inspects the on-screen UI tree to detect feeds.
- Foreground app is compared against stored limits; on breach the app shows an overlay or navigates away.
- A device-admin receiver makes uninstalling harder during sessions.
- Boot, time-changed and time-zone-changed receivers plus a service-check worker keep the service alive and guard against clock tampering.

### Data layer
- Separate Room databases for app limits, app usage, feature status and file downloads.
- Usage models: per-app, hourly, weekly, with last-week comparison and cumulative "time saved".
- Preferences stored as typed key-value tables (boolean, long, string).

### Background work (WorkManager)
- Daily: save usage, back up settings, clear old data, send notifications, schedule focus sessions.
- Weekly: focus stats sync.
- Social: group rank sync, referral registration, profile sync.

### OEM handling
- Separate permission walkthroughs for Xiaomi, Redmi and Samsung (accessibility and overlay permissions). This is a real reliability problem to plan for.

### Assets of note
- The avatar illustration set in the reference appears to be the public-domain Open Peeps set. Public-domain sources like that can be used directly, but get them from the original source, not from the APK.

## Takeaways for Focus
1. Build one module per feature.
2. Reliability (services surviving reboots, OEM battery killers, clock changes) is a core feature, not polish.
3. Keep blocking logic and data in separate layers so limits, schedules and focus sessions share one engine.
4. Gamification, social and AI coach are later phases.
