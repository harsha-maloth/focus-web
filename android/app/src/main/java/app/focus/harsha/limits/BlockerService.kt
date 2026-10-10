package app.focus.harsha.limits

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import app.focus.harsha.data.FocusDb
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

    override fun onServiceConnected() {
        super.onServiceConnected()
        // An app can pass its limit while it stays open and fires no new window event, so re-check.
        ticker = scope.launch {
            while (isActive) {
                delay(TICK_MS)
                current?.let { check(it, force = true) }
            }
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return
        // Remember the front app even if it is never blocked, so the timer re-check sees it leave.
        current = pkg
        scope.launch { check(pkg, force = false) }
    }

    override fun onInterrupt() {}

    override fun onDestroy() {
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
        if (!UsageRepository.hasAccess(this)) return
        val today = LocalDate.now(ZoneId.systemDefault())
        val used = UsageRepository.day(this, today).apps.firstOrNull { it.pkg == pkg }?.ms ?: 0L
        if (LimitMath.isOver(used, limit.limitMs)) {
            show(
                "Time's up",
                "You reached today's limit for ${limit.label}. It opens again tomorrow, or change the limit in Focus.",
            )
        }
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
    }
}
