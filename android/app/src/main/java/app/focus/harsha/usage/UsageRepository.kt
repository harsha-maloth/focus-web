package app.focus.harsha.usage

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process
import java.time.LocalDate
import java.time.ZoneId

data class AppUsage(val pkg: String, val label: String, val ms: Long)

/** `live` is true when the numbers were counted by this app itself, not taken from the system log. */
data class UsageSummary(val apps: List<AppUsage>, val totalMs: Long, val live: Boolean = false)

object UsageRepository {
    /** Apps used for less than this are left out of the list. */
    private const val MIN_MS = 60_000L

    /** True once the person has switched on Settings > Usage access for this app. */
    @Suppress("DEPRECATION")
    fun hasAccess(context: Context): Boolean {
        val ops = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
        } else {
            ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.packageName)
        }
        return mode == AppOpsManager.MODE_ALLOWED
    }

    /**
     * Foreground time per app on one local day (midnight to midnight, or to now for today).
     * Needs usage access. Uses the system's daily totals; the event log is only a fallback.
     * Android has no public way to read the Digital Wellbeing app's own data, so this is the
     * closest source. Numbers can differ a little from that app.
     */
    fun day(context: Context, date: LocalDate): UsageSummary {
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val zone = ZoneId.systemDefault()
        val start = date.atStartOfDay(zone).toInstant().toEpochMilli()
        val end = minOf(date.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli(), System.currentTimeMillis())
        if (end <= start) return UsageSummary(emptyList(), 0L)

        // The system's own daily totals first; the event log only if those come back empty.
        var totals = bucketTotals(usm, start, end)
        if (totals.isEmpty()) totals = eventTotals(usm, start, end)

        val pm = context.packageManager
        val apps = totals
            .filter { it.value >= MIN_MS }
            .mapNotNull { (pkg, ms) ->
                // Only apps with a launcher icon: hides system services nobody opens on purpose.
                if (pm.getLaunchIntentForPackage(pkg) == null) null else AppUsage(pkg, labelOf(pm, pkg), ms)
            }
            .sortedByDescending { it.ms }
        return UsageSummary(apps, apps.sumOf { it.ms })
    }

    /** Three ways to count one day, side by side, to see which one a phone gets wrong. */
    data class Diagnostics(val windowMs: Long, val bucketsMs: Long, val eventsMs: Long)

    fun diagnose(context: Context, date: LocalDate): Diagnostics {
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val zone = ZoneId.systemDefault()
        val start = date.atStartOfDay(zone).toInstant().toEpochMilli()
        val end = minOf(date.plusDays(1).atStartOfDay(zone).toInstant().toEpochMilli(), System.currentTimeMillis())
        if (end <= start) return Diagnostics(0L, 0L, 0L)
        return Diagnostics(
            windowMs = end - start,
            bucketsMs = bucketTotals(usm, start, end).values.sum(),
            eventsMs = eventTotals(usm, start, end).values.sum(),
        )
    }

    private fun bucketTotals(usm: UsageStatsManager, start: Long, end: Long): Map<String, Long> {
        val buckets = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end)
            .map { RawBucket(it.packageName, it.firstTimeStamp, it.totalTimeInForeground) }
        return UsageAggregator.fromBuckets(buckets, start, end)
    }

    private fun readEvents(usm: UsageStatsManager, start: Long, end: Long): List<RawEvent> {
        val raw = ArrayList<RawEvent>()
        val events = usm.queryEvents(start, end)
        val event = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            raw.add(RawEvent(event.packageName ?: "", event.className ?: "", event.eventType, event.timeStamp))
        }
        return raw
    }

    private fun eventTotals(usm: UsageStatsManager, start: Long, end: Long): Map<String, Long> =
        UsageAggregator.foregroundMs(readEvents(usm, start, end), end)

    /** The app in front according to the last few minutes of the event log, or null. */
    fun lastForeground(context: Context): String? {
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val end = System.currentTimeMillis()
        return UsageAggregator.openAt(readEvents(usm, end - 10 * 60_000L, end))
    }

    @Suppress("DEPRECATION")
    private fun labelOf(pm: PackageManager, pkg: String): String =
        try {
            pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
        } catch (e: PackageManager.NameNotFoundException) {
            pkg
        }
}
