package app.focus.harsha.usage

/**
 * Counts foreground time ourselves, from what the accessibility service sees, instead of trusting
 * the system's usage log (which is wrong on some phones). Pure Kotlin so it can be unit-tested.
 *
 * It holds the app now in front (null = home screen, screen off or unknown) and the time of the
 * last update. Every call returns the time to credit to the app that was in front. A single
 * credit is capped at [maxGapMs]: if the service was frozen or killed for a while, that gap is
 * not counted, so the total can never run away (the failure that gave 48 h in a day).
 */
class LiveTracker(private val maxGapMs: Long = 90_000L) {
    data class Credit(val pkg: String, val ms: Long)

    private var current: String? = null
    private var lastMs = 0L

    @Synchronized
    fun onForeground(pkg: String?, nowMs: Long): List<Credit> {
        val out = credit(nowMs)
        current = pkg
        lastMs = nowMs
        return out
    }

    @Synchronized
    fun onTick(nowMs: Long): List<Credit> {
        val out = credit(nowMs)
        lastMs = nowMs
        return out
    }

    fun onScreenOff(nowMs: Long): List<Credit> = onForeground(null, nowMs)

    @Synchronized
    fun currentPkg(): String? = current

    private fun credit(nowMs: Long): List<Credit> {
        val pkg = current ?: return emptyList()
        val ms = (nowMs - lastMs).coerceIn(0L, maxGapMs)
        return if (ms > 0L) listOf(Credit(pkg, ms)) else emptyList()
    }
}
