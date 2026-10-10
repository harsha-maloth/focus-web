package app.focus.harsha.usage

import android.content.Context
import app.focus.harsha.data.DailyUsageEntity
import app.focus.harsha.data.FocusDb
import java.time.LocalDate
import java.time.ZoneId

/** Copies the system's recent usage into the local database, then reads the last 7 days back. */
object UsageSync {
    suspend fun loadWeek(context: Context): Map<LocalDate, UsageSummary> {
        val dao = FocusDb.get(context).usage()
        val days = WeekMath.lastDays(LocalDate.now(ZoneId.systemDefault()))
        val from = days.first().toString()
        val to = days.last().toString()

        val stored = dao.range(from, to).groupBy { it.date }
        for (day in days) {
            val key = day.toString()
            val fresh = UsageRepository.day(context, day)
            val storedMs = stored[key].orEmpty().sumOf { it.ms }
            if (WeekMath.shouldReplace(storedMs, fresh.totalMs)) {
                dao.replaceDay(key, fresh.apps.map { DailyUsageEntity(key, it.pkg, it.label, it.ms) })
            }
        }

        val rows = dao.range(from, to).groupBy { it.date }
        return days.associateWith { day ->
            val apps = rows[day.toString()].orEmpty().map { AppUsage(it.pkg, it.label, it.ms) }
            UsageSummary(apps, apps.sumOf { it.ms })
        }
    }
}
