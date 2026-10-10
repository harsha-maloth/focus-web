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

data class UsageSummary(val apps: List<AppUsage>, val totalMs: Long)

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

    /** Foreground time per app since local midnight. Needs usage access. */
    fun today(context: Context): UsageSummary {
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val zone = ZoneId.systemDefault()
        val start = LocalDate.now(zone).atStartOfDay(zone).toInstant().toEpochMilli()
        val end = System.currentTimeMillis()

        val raw = ArrayList<RawEvent>()
        val events = usm.queryEvents(start, end)
        val event = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(event)
            raw.add(RawEvent(event.packageName, event.className ?: "", event.eventType, event.timeStamp))
        }

        val pm = context.packageManager
        val apps = UsageAggregator.foregroundMs(raw, end)
            .filter { it.value >= MIN_MS }
            .mapNotNull { (pkg, ms) ->
                // Only apps with a launcher icon: hides system services nobody opens on purpose.
                if (pm.getLaunchIntentForPackage(pkg) == null) null else AppUsage(pkg, labelOf(pm, pkg), ms)
            }
            .sortedByDescending { it.ms }
        return UsageSummary(apps, apps.sumOf { it.ms })
    }

    @Suppress("DEPRECATION")
    private fun labelOf(pm: PackageManager, pkg: String): String =
        try {
            pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
        } catch (e: PackageManager.NameNotFoundException) {
            pkg
        }
}
