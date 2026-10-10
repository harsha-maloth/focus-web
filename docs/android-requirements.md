# Android Requirements (from reference study)

Facts gathered from the manifest, framework class references and dependency metadata of the Regain reference app. These are platform facts and library versions, not code. Use them as a checklist, then verify against current Android and Play documentation.

## Permissions and components seen

| Permission / action | Purpose in a focus app | Focus decision |
|---|---|---|
| `BIND_ACCESSIBILITY_SERVICE` (+ AccessibilityService) | Detect foreground app and read UI tree | **MVP** |
| `PACKAGE_USAGE_STATS` | Per-app usage data | **MVP** (user grants in Settings) |
| `SYSTEM_ALERT_WINDOW` | Overlay block screen | **MVP** |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_SPECIAL_USE` | Focus session service | **MVP** (special use needs a Play declaration) |
| `POST_NOTIFICATIONS` | Notifications on Android 13+ | **MVP** |
| `RECEIVE_BOOT_COMPLETED`, `MY_PACKAGE_REPLACED` | Restart after reboot or app update | **MVP** |
| `TIME_SET`, `TIMEZONE_CHANGED` | Recompute windows when the clock changes | **MVP** |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Keep services alive on aggressive OEMs | MVP, with user explanation |
| `WAKE_LOCK`, `VIBRATE`, `INTERNET`, `ACCESS_NETWORK_STATE` | Misc | As needed |
| `SCHEDULE_EXACT_ALARM` | Exact schedule triggers | Phase 2 (check policy) |
| `USE_EXACT_ALARM` | Same, auto-granted | Play restricts this to alarm/calendar-type apps; prefer `SCHEDULE_EXACT_ALARM` or inexact work |
| `QUERY_ALL_PACKAGES` | List all installed apps | Play-restricted; try launcher-intent `<queries>` first |
| `BIND_NOTIFICATION_LISTENER_SERVICE` | Batch or hold notifications | Phase 2 |
| `BIND_DEVICE_ADMIN` + device admin actions | Harder to uninstall during sessions | Deferred (policy and trust cost) |
| `ACCESS_ADSERVICES_*` | Ad SDK permissions | **Not needed** (no ads) |
| `DUMP`, `READ_BASIC_PHONE_STATE` | Unclear (library or special feature) | Skip unless a feature needs it |

## Framework APIs the reference app touches

- Accessibility: `AccessibilityService`, `AccessibilityServiceInfo`, `AccessibilityEvent`, `AccessibilityNodeInfo` (including collection info, `ExtraRenderingInfo`), `AccessibilityWindowInfo`, `AccessibilityManager` (state listeners).
- Usage: `UsageStatsManager`, `UsageEvents`.
- Windows: `WindowManager`, `WindowManager.LayoutParams` (overlay).
- Scheduling: `AlarmManager` (incl. `AlarmClockInfo`), `JobScheduler`, `PowerManager.WakeLock`.
- State checks: `Settings.Secure` / `Settings.Global` (is accessibility enabled), `ActivityManager` (running services), `KeyguardManager` (lock state), `PackageManager`.
- Notifications: `NotificationListenerService`.
- Admin: `DevicePolicyManager`, `DeviceAdminReceiver`.
- Edge case worth handling: `ForegroundServiceStartNotAllowedException` (Android 12+ background-start limits).
- Not seen: `VpnService`, so website blocking in the reference is not VPN-based. Likely reads the browser URL bar via accessibility. Revisit later.

## Dependency versions seen (reference snapshot, 2025-era)

| Area | Library | Version seen |
|---|---|---|
| UI | Compose (ui, foundation, animation) | 1.8.0 |
| UI | Material 3 | 1.3.2 |
| UI | Navigation Compose | 2.8.5 |
| UI | Lifecycle (runtime, viewmodel) | 2.8.7 |
| UI | Activity Compose | 1.10.1 |
| Widgets | Glance (appwidget, material3) | 1.1.1 |
| Data | Room | 2.6.1 |
| Data | DataStore Preferences | 1.0.0 |
| Background | WorkManager | 2.10.4 |
| DI | Dagger / Hilt | 2.56 |
| DI | Hilt Navigation Compose, Hilt Work | 1.2.0 |
| Async | Kotlin Coroutines | 1.9.0 |
| Auth | Credentials (Google sign-in) | 1.3.0 |
| Splash | core-splashscreen | 1.0.1 |

Do not pin these. Use current stable versions through a Gradle version catalog and let Android Studio suggest upgrades. The list shows the *kind* of stack that works, not the numbers to use.

## What this changes in the plan
- MVP permission set is smaller than the reference's. Skip ads, device admin, exact alarms and `QUERY_ALL_PACKAGES` at first.
- Widgets: use Glance (already part of the Compose world).
- Plan an "is the accessibility service really running?" check using `Settings.Secure` plus a watchdog, since Android can silently stop services.
- Handle foreground-service start restrictions explicitly.

## Not yet collected
- Screens, ViewModels and use cases: obfuscated in the reference, so not recoverable. Data-model concepts are in `reference-structure.md`.
