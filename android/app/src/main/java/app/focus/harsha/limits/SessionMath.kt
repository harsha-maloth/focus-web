package app.focus.harsha.limits

/** Pure rules for focus sessions, so they can be unit-tested. Times are epoch milliseconds. */
object SessionMath {
    val PRESET_MINUTES = listOf(15, 25, 45, 60, 90)

    fun plannedEndMs(startMs: Long, plannedMs: Long): Long = startMs + plannedMs

    fun remainingMs(startMs: Long, plannedMs: Long, nowMs: Long): Long =
        (plannedEndMs(startMs, plannedMs) - nowMs).coerceAtLeast(0L)

    fun isFinished(startMs: Long, plannedMs: Long, nowMs: Long): Boolean =
        nowMs >= plannedEndMs(startMs, plannedMs)

    /** Time that counts: from start to the end, never negative and never more than planned. */
    fun creditedMs(startMs: Long, plannedMs: Long, endedMs: Long): Long =
        (endedMs - startMs).coerceIn(0L, plannedMs)

    /** Minutes left, rounded up, for messages ("1 min left" rather than "0"). */
    fun minutesLeftCeil(remainingMs: Long): Int = ((remainingMs + 59_999L) / 60_000L).toInt()

    /** During a session an app may be used if it is Focus, a phone essential, or on the allowed list. */
    fun isAllowed(pkg: String, allowed: Set<String>, ignored: Set<String>, ownPkg: String): Boolean =
        pkg == ownPkg || pkg in ignored || pkg in allowed
}
