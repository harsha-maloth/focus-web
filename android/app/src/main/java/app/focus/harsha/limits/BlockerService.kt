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
 * Watches which app comes to the front. If it has a daily limit and today's use has reached it,
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
        if (LimitMath.neverBlocked(pkg, packageName)) return
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
        val now = System.currentTimeMillis()
        synchronized(lastCheck) {
            val last = lastCheck[pkg] ?: 0L
            if (!force && now - last < MIN_GAP_MS) return
            lastCheck[pkg] = now
        }
        val limit = FocusDb.get(this).limits().all().firstOrNull { it.pkg == pkg } ?: return
        if (!UsageRepository.hasAccess(this)) return
        val today = LocalDate.now(ZoneId.systemDefault())
        val used = UsageRepository.day(this, today).apps.firstOrNull { it.pkg == pkg }?.ms ?: 0L
        if (LimitMath.isOver(used, limit.limitMs)) {
            val intent = Intent(this, BlockActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)
                .putExtra(BlockActivity.EXTRA_LABEL, limit.label)
            startActivity(intent)
        }
    }

    private companion object {
        const val TICK_MS = 30_000L
        const val MIN_GAP_MS = 5_000L
    }
}
