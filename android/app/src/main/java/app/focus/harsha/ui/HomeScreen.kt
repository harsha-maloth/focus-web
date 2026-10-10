package app.focus.harsha.ui

import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import app.focus.harsha.usage.AppUsage
import app.focus.harsha.usage.UsageRepository
import app.focus.harsha.usage.UsageSync
import app.focus.harsha.usage.WeekMath
import app.focus.harsha.usage.UsageSummary
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.TextStyle
import java.util.Locale

private sealed interface UsageState {
    data object Loading : UsageState
    data object NoAccess : UsageState
    data class Ready(val week: Map<LocalDate, UsageSummary>) : UsageState
    data class Failed(val message: String) : UsageState
}

@Composable
fun HomeScreen() {
    val context = LocalContext.current
    var hasAccess by remember { mutableStateOf(UsageRepository.hasAccess(context)) }
    var refresh by remember { mutableIntStateOf(0) }
    var state by remember { mutableStateOf<UsageState>(UsageState.Loading) }
    var diag by remember { mutableStateOf<String?>(null) }
    var selected by remember { mutableStateOf(LocalDate.now(ZoneId.systemDefault())) }

    // Coming back from the Settings screen: check the permission again and reload.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        hasAccess = UsageRepository.hasAccess(context)
        refresh++
    }

    LaunchedEffect(hasAccess, refresh) {
        if (!hasAccess) {
            state = UsageState.NoAccess
            return@LaunchedEffect
        }
        state = try {
            UsageState.Ready(withContext(Dispatchers.IO) { UsageSync.loadWeek(context) })
        } catch (e: Exception) {
            UsageState.Failed(e.message ?: "Could not read usage.")
        }
    }

    LaunchedEffect(selected, hasAccess, refresh) {
        if (!hasAccess) return@LaunchedEffect
        diag = try {
            withContext(Dispatchers.IO) {
                val d = UsageRepository.diagnose(context, selected)
                "System totals " + formatDuration(d.bucketsMs) +
                    " · Event log " + formatDuration(d.eventsMs) +
                    " · Day so far " + formatDuration(d.windowMs)
            }
        } catch (e: Exception) {
            null
        }
    }

    val week = (state as? UsageState.Ready)?.week
    val summary = week?.get(selected)
    val today = LocalDate.now(ZoneId.systemDefault())
    val title = if (selected == today) "Screen time today" else "Screen time, " + dayName(selected, long = true)

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        Header(
            title = title,
            totalText = summary?.let { formatDuration(it.totalMs) },
            sourceText = summary?.let { if (it.live) "Counted live by Focus" else "System estimate" },
            averageText = week?.let { w -> "Daily average " + formatDuration(WeekMath.averageMs(w.values.map { it.totalMs })) },
        )
        if (week != null) {
            WeekStrip(week, selected, today) { selected = it }
        }
        diag?.let {
            Text(
                "Check: $it",
                modifier = Modifier.padding(horizontal = 16.dp),
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        when (val s = state) {
            UsageState.Loading -> Message("Reading usage…")
            UsageState.NoAccess -> AccessCard(context)
            is UsageState.Failed -> Message(s.message)
            is UsageState.Ready -> {
                val day = s.week[selected]
                if (day == null || day.apps.isEmpty()) {
                    Message("No app was open for a minute on this day.")
                } else {
                    AppList(day)
                }
            }
        }
    }
}

private fun dayName(date: LocalDate, long: Boolean = false): String =
    date.dayOfWeek.getDisplayName(if (long) TextStyle.FULL else TextStyle.SHORT, Locale.getDefault())

/** Seven bars, oldest to newest. Tap a bar to show that day below. */
@Composable
private fun WeekStrip(week: Map<LocalDate, UsageSummary>, selected: LocalDate, today: LocalDate, onSelect: (LocalDate) -> Unit) {
    val days = WeekMath.lastDays(today)
    val longest = days.maxOf { week[it]?.totalMs ?: 0L }.coerceAtLeast(1L)
    Row(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        for (day in days) {
            val ms = week[day]?.totalMs ?: 0L
            val isSelected = day == selected
            Column(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(10.dp))
                    .clickable { onSelect(day) }
                    .padding(vertical = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Box(Modifier.height(64.dp), contentAlignment = Alignment.BottomCenter) {
                    Box(
                        Modifier
                            .fillMaxWidth(0.6f)
                            .height((6 + 58 * ms.toFloat() / longest.toFloat()).dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(
                                if (isSelected) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.surfaceVariant,
                            ),
                    )
                }
                Text(
                    dayName(day),
                    fontSize = 12.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                    color = if (isSelected) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun Header(title: String, totalText: String?, sourceText: String?, averageText: String?) {
    Box(
        Modifier
            .fillMaxWidth()
            .background(HeaderTeal)
            .statusBarsPadding()
            .padding(horizontal = 24.dp, vertical = 20.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Text(title, color = Color(0xFFCFE6E9), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
            Text(
                totalText ?: "–",
                color = Color.White,
                fontSize = 40.sp,
                fontWeight = FontWeight.Bold,
            )
            if (sourceText != null) {
                Text(sourceText, color = Color(0xFFCFE6E9), fontSize = 13.sp)
            }
            if (averageText != null) {
                Text(averageText, color = Color(0xFFCFE6E9), fontSize = 13.sp)
            }
        }
    }
}

@Composable
private fun Message(text: String) {
    Text(
        text,
        modifier = Modifier.padding(24.dp),
        color = MaterialTheme.colorScheme.onSurfaceVariant,
    )
}

@Composable
private fun AccessCard(context: Context) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Allow usage access", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            Text(
                "Focus needs to read how long apps were open. Android asks you to switch this on in " +
                    "Settings. Find Focus in the list and turn on \"Permit usage access\". " +
                    "The data stays on this phone: this version cannot connect to the internet.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Button(onClick = { openUsageAccessSettings(context) }) {
                Text("Open settings")
            }
        }
    }
}

private fun openUsageAccessSettings(context: Context) {
    try {
        context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
    } catch (e: ActivityNotFoundException) {
        // Some phones hide this screen; the person can find it under Settings > Apps > Special access.
    }
}

@Composable
private fun AppList(summary: UsageSummary) {
    val longest = summary.apps.maxOf { it.ms }.coerceAtLeast(1L)
    LazyColumn(
        contentPadding = PaddingValues(
            start = 16.dp,
            end = 16.dp,
            top = 16.dp,
            bottom = 16.dp,
        ),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        items(summary.apps, key = { it.pkg }) { app ->
            AppRow(app, fraction = app.ms.toFloat() / longest.toFloat())
        }
    }
}

@Composable
private fun AppRow(app: AppUsage, fraction: Float) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Box(
                Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    app.label.take(1).uppercase(),
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                )
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(
                        app.label,
                        modifier = Modifier.weight(1f),
                        maxLines = 1,
                        color = MaterialTheme.colorScheme.onSurface,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(formatDuration(app.ms), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                LinearProgressIndicator(
                    progress = { fraction },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp)),
                    color = MaterialTheme.colorScheme.secondary,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant,
                )
            }
        }
    }
}
