package app.focus.harsha.usage

import android.content.Context

/** Remembers when live counting first started, so days before it are labelled as estimates. */
object LivePrefs {
    private const val FILE = "focus_prefs"
    private const val KEY = "live_since_ms"

    fun sinceMs(context: Context): Long =
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE).getLong(KEY, 0L)

    fun ensureSince(context: Context, nowMs: Long) {
        val prefs = context.getSharedPreferences(FILE, Context.MODE_PRIVATE)
        if (prefs.getLong(KEY, 0L) == 0L) prefs.edit().putLong(KEY, nowMs).apply()
    }
}
