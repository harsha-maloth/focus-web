package app.focus.harsha.limits

/** Pure rules for daily app limits, so they can be unit-tested. */
object LimitMath {
    /** Limits the picker offers, in minutes. */
    val PRESET_MINUTES = listOf(15, 30, 45, 60, 90, 120)

    fun minutesToMs(minutes: Int): Long = minutes * 60_000L

    /** True once today's use has reached the limit. A limit of 0 or less is treated as "no limit". */
    fun isOver(usedMs: Long, limitMs: Long): Boolean = limitMs > 0L && usedMs >= limitMs

    fun remainingMs(usedMs: Long, limitMs: Long): Long = (limitMs - usedMs).coerceAtLeast(0L)

    /** Apps that must never be blocked: this app (so limits can be changed) and the phone itself. */
    fun neverBlocked(pkg: String, ownPkg: String): Boolean =
        pkg == ownPkg || pkg == "com.android.systemui" || pkg == "android"
}
