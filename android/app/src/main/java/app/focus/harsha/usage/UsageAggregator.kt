package app.focus.harsha.usage

/** One event from the system usage log, reduced to what the maths needs. */
data class RawEvent(val pkg: String, val cls: String, val type: Int, val timeMs: Long)

/**
 * Adds up how long each app was in the foreground, from the system's event log.
 * Pure Kotlin so it can be unit-tested without a phone.
 *
 * Only ONE app is in front at a time. When any app resumes, the previous one is closed at that
 * moment; a pause closes the app only if it is the current one; screen off, lock screen or
 * shutdown closes whatever is open. This matters because the log is messy: pause events can go
 * missing (killed activities, some tablets and OEM skins), and counting each activity on its own
 * made one unclosed activity run until the end of the day (the first build showed 48 h in a day).
 * An app still in front at `endMs` counts up to `endMs`. Split-screen time is credited to the
 * app that resumed last, so it slightly undercounts the other one.
 */
object UsageAggregator {
    /** Same value as UsageEvents.Event.MOVE_TO_FOREGROUND / ACTIVITY_RESUMED. */
    const val RESUMED = 1

    /** Same value as UsageEvents.Event.MOVE_TO_BACKGROUND / ACTIVITY_PAUSED. */
    const val PAUSED = 2

    /** UsageEvents.Event.SCREEN_NON_INTERACTIVE: the screen turned off. */
    const val SCREEN_OFF = 16

    /** UsageEvents.Event.KEYGUARD_SHOWN: the lock screen came up. */
    const val KEYGUARD_SHOWN = 17

    /** UsageEvents.Event.DEVICE_SHUTDOWN. */
    const val SHUTDOWN = 26

    fun foregroundMs(events: List<RawEvent>, endMs: Long): Map<String, Long> {
        val totals = HashMap<String, Long>()
        var current: String? = null
        var since = 0L

        fun close(at: Long) {
            val pkg = current ?: return
            val ms = at - since
            if (ms > 0L) totals[pkg] = (totals[pkg] ?: 0L) + ms
            current = null
        }

        for (e in events.sortedBy { it.timeMs }) {
            when (e.type) {
                RESUMED -> if (current != e.pkg) {
                    close(e.timeMs)
                    current = e.pkg
                    since = e.timeMs
                }
                PAUSED -> if (current == e.pkg) close(e.timeMs)
                SCREEN_OFF, KEYGUARD_SHOWN, SHUTDOWN -> close(e.timeMs)
            }
        }
        close(endMs)
        return totals
    }
}
