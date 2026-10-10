package app.focus.harsha.limits

import android.accessibilityservice.AccessibilityService
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.view.accessibility.AccessibilityEvent
import app.focus.harsha.data.FocusDb
import app.focus.harsha.usage.LivePrefs
import app.focus.harsha.usage.LiveTracker
import app.focus.harsha.usage.UsageRepository
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

/**
 * Watches which app comes to the front. During a focus session it blocks every app that is not on
 * the allowed list; otherwise, if the app has a daily limit and today's use has reached it, it
 * shows BlockActivity on top. It reads only the package name of the window: the service config
 * asks for no window content and no text (res/xml/blocker_service.xml).
 */
class BlockerService : AccessibilityService() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var ticker: Job? = null

    /** The app currently in front, as last reported. Touched only on the main thread. */
    private var current: String? = null

    /** Last time each package was checked, to avoid reading the usage log on every tiny event. */
    private val lastCheck = HashMap<String, Long>()

    /** Counts foreground time itself (see LiveTracker); the system log is only a fallback. */
    private val tracker = LiveTracker()
    private var overlays: Set<String> = emptySet()
    private var homes: Set<String> = emptySet()

    private val screenReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val now = System.currentTimeMillis()
            when (intent?.action) {
                Intent.ACTION_SCREEN_OFF -> record(tracker.onScreenOff(now))
                Intent.ACTION_USER_PRESENT -> scope.launch {
                    // After unlock there may be no window event for the app we return to: ask the log.
                    val pkg = try { UsageRepository.lastForeground(this@BlockerService) } catch (e: Exception) { null }
                    if (pkg != null && pkg !in overlays) {
                        record(tracker.onForeground(if (pkg in homes) null else pkg, System.currentTimeMillis()))
                    }
                }
            }
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        val now = System.currentTimeMillis()
        LivePrefs.ensureSince(this, now)
        overlays = SystemPackages.overlays(this)
        homes = SystemPackages.homes(this)
        tracker.onForeground(null, now)
        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_USER_PRESENT)
        }
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(screenReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(screenReceiver, filter)
        }
        // An app can pass its limit while it stays open and fires no new window event, so re-check.
        ticker = scope.launch {
            while (isActive) {
                delay(TICK_MS)
                record(tracker.onTick(System.currentTimeMillis()))
                if (System.currentTimeMillis() - lastSystemLookup > SYSTEM_LOOKUP_MS) {
                    overlays = SystemPackages.overlays(this@BlockerService)
                    homes = SystemPackages.homes(this@BlockerService)
                    lastSystemLookup = System.currentTimeMillis()
                }
                current?.let { check(it, force = true) }
            }
        }
    }

    private var lastSystemLookup = System.currentTimeMillis()

    /** Adds credits to today's live totals. Safe to call from any thread. */
    private fun record(credits: List<LiveTracker.Credit>) {
        if (credits.isEmpty()) return
        val date = LocalDate.now(ZoneId.systemDefault()).toString()
        scope.launch {
            val dao = FocusDb.get(this@BlockerService).live()
            for (c in credits) dao.add(date, c.pkg, labelOf(c.pkg), c.ms)
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        // Remember the front app even if it is never blocked, so the timer re-check sees it leave.
        current = pkg
        // Keyboards, System UI and system dialogs appear over an app without replacing it.
        if (pkg !in overlays) {
            record(tracker.onForeground(if (pkg in homes) null else pkg, System.currentTimeMillis()))
        }
        scope.launch { check(pkg, force = false) }
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
        record(tracker.onTick(System.currentTimeMillis()))
        try {
            unregisterReceiver(screenReceiver)
        } catch (e: Exception) {
        }
        ticker?.cancel()
        scope.cancel()
        super.onDestroy()
    }

    private suspend fun check(pkg: String, force: Boolean) {
        val db = FocusDb.get(this)
        val ignored = ignoredPackages()
        if (LimitMath.neverBlocked(pkg, packageName) || pkg in ignored) return

        // 1. A running focus session blocks everything not on the allowed list. No throttle: it is
        //    a cheap database read and a blocked app must be blocked again at once if reopened.
        val now = System.currentTimeMillis()
        val session = db.sessions().running()
        if (session != null) {
            if (SessionMath.isFinished(session.startMs, session.plannedMs, now)) {
                db.sessions().finish(session.id, SessionMath.plannedEndMs(session.startMs, session.plannedMs), "completed")
            } else {
                val allowed = db.allowed().all().map { it.pkg }.toSet()
                if (!SessionMath.isAllowed(pkg, allowed, ignored, packageName)) {
                    val left = SessionMath.minutesLeftCeil(SessionMath.remainingMs(session.startMs, session.plannedMs, now))
                    val label = labelOf(pkg)
                    show("Stay focused", "$label is not allowed during your focus session. $left min left.")
                    return
                }
            }
        }

        // 2. Daily limits, throttled because they read the usage log.
        synchronized(lastCheck) {
            val last = lastCheck[pkg] ?: 0L
            if (!force && now - last < MIN_GAP_MS) return
            lastCheck[pkg] = now
        }
        val limit = db.limits().all().firstOrNull { it.pkg == pkg } ?: return
        val today = LocalDate.now(ZoneId.systemDefault())
        val used = usedToday(db, pkg, today)
        if (LimitMath.isOver(used, limit.limitMs)) {
            show(
                "Time's up",
                "You reached today's limit for ${limit.label}. It opens again tomorrow, or change the limit in Focus.",
            )
        }
    }

    /** Live count if live tracking covers the whole day so far, else the system's number. */
    private suspend fun usedToday(db: FocusDb, pkg: String, today: LocalDate): Long {
        val dayStart = today.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
        val since = LivePrefs.sinceMs(this)
        if (since in 1..dayStart) {
            val key = today.toString()
            return db.live().range(key, key).firstOrNull { it.pkg == pkg }?.ms ?: 0L
        }
        if (!UsageRepository.hasAccess(this)) return 0L
        return UsageRepository.day(this, today).apps.firstOrNull { it.pkg == pkg }?.ms ?: 0L
    }

    private fun show(title: String, message: String) {
        val intent = Intent(this, BlockActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)
            .putExtra(BlockActivity.EXTRA_TITLE, title)
            .putExtra(BlockActivity.EXTRA_MESSAGE, message)
        startActivity(intent)
    }

    private var ignoredCache: Set<String> = emptySet()
    private var ignoredAt = 0L

    /** Home, keyboard, dialer and System UI; looked up again every 5 minutes. */
    private fun ignoredPackages(): Set<String> {
        val now = System.currentTimeMillis()
        if (ignoredCache.isEmpty() || now - ignoredAt > 5 * 60_000L) {
            ignoredCache = SystemPackages.ignored(this)
            ignoredAt = now
        }
        return ignoredCache
    }

    private fun labelOf(pkg: String): String =
        try {
            packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
        } catch (e: Exception) {
            pkg
        }

    private companion object {
        const val TICK_MS = 30_000L
        const val MIN_GAP_MS = 5_000L
        const val SYSTEM_LOOKUP_MS = 5 * 60_000L
    }
}
