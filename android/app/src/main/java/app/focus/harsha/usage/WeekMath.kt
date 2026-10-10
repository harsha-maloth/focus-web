package app.focus.harsha.usage

import java.time.LocalDate

/** Pure date and total helpers for the weekly view, so they can be unit-tested. */
object WeekMath {
    /** The last `n` days ending on `today`, oldest first. */
    fun lastDays(today: LocalDate, n: Int = 7): List<LocalDate> =
        (n - 1 downTo 0).map { today.minusDays(it.toLong()) }

    /**
     * Whether a freshly computed day should replace what is stored. The system log only keeps a few
     * days, so a shorter or empty result (data already purged) must never wipe a fuller stored day.
     */
    fun shouldReplace(storedMs: Long, newMs: Long): Boolean = newMs > 0L && newMs >= storedMs

    /** Average over the days that have any screen time; 0 when none do. */
    fun averageMs(totals: List<Long>): Long {
        val used = totals.filter { it > 0L }
        return if (used.isEmpty()) 0L else used.sum() / used.size
    }
}
