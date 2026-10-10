package app.focus.harsha.usage

/** One event from the system usage log, reduced to what the maths needs. */
data class RawEvent(val pkg: String, val cls: String, val type: Int, val timeMs: Long)

/**
 * Adds up how long each app was in the foreground, from resume and pause events.
 * Pure Kotlin so it can be unit-tested without a phone.
 *
 * Events are paired per activity (package + class), because an app can have several activities
 * and the system reports each one. A pause with no earlier resume in the window is ignored (the
 * app was already open before the window began). An activity still resumed at `endMs` counts up
 * to `endMs`.
 */
object UsageAggregator {
    /** Same value as UsageEvents.Event.MOVE_TO_FOREGROUND / ACTIVITY_RESUMED. */
    const val RESUMED = 1

    /** Same value as UsageEvents.Event.MOVE_TO_BACKGROUND / ACTIVITY_PAUSED. */
    const val PAUSED = 2

    fun foregroundMs(events: List<RawEvent>, endMs: Long): Map<String, Long> {
        val open = HashMap<String, Long>()
        val totals = HashMap<String, Long>()

        fun add(pkg: String, ms: Long) {
            if (ms > 0L) totals[pkg] = (totals[pkg] ?: 0L) + ms
        }

        for (e in events) {
            val key = e.pkg + "/" + e.cls
            when (e.type) {
                RESUMED -> open[key] = e.timeMs
                PAUSED -> {
                    val started = open.remove(key)
                    if (started != null) add(e.pkg, e.timeMs - started)
                }
            }
        }
        for ((key, started) in open) {
            add(key.substringBefore('/'), endMs - started)
        }
        return totals
    }
}
