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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import app.focus.harsha.data.AppLimitEntity
import app.focus.harsha.data.FocusDb
import app.focus.harsha.limits.AccessibilityStatus
import app.focus.harsha.limits.InstalledApp
import app.focus.harsha.limits.InstalledApps
import app.focus.harsha.limits.LimitMath
import app.focus.harsha.usage.UsageRepository
import java.time.LocalDate
import java.time.ZoneId
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private data class LimitRow(val limit: AppLimitEntity, val usedMs: Long)

@Composable
fun LimitsScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var refresh by remember { mutableIntStateOf(0) }
    var blockerOn by remember { mutableStateOf(AccessibilityStatus.isBlockerEnabled(context)) }
    var usageOn by remember { mutableStateOf(UsageRepository.hasAccess(context)) }
    var rows by remember { mutableStateOf<List<LimitRow>>(emptyList()) }
    var picking by remember { mutableStateOf(false) }
    var chosen by remember { mutableStateOf<InstalledApp?>(null) }

    // Back from Settings: re-check both permissions and reload.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        blockerOn = AccessibilityStatus.isBlockerEnabled(context)
        usageOn = UsageRepository.hasAccess(context)
        refresh++
    }

    LaunchedEffect(refresh, usageOn) {
        rows = withContext(Dispatchers.IO) {
            val limits = FocusDb.get(context).limits().all()
            val used = if (usageOn) {
                UsageRepository.day(context, LocalDate.now(ZoneId.systemDefault())).apps.associate { it.pkg to it.ms }
            } else {
                emptyMap()
            }
            limits.map { LimitRow(it, used[it.pkg] ?: 0L) }
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        Box(
            Modifier
                .fillMaxWidth()
                .background(HeaderTeal)
                .statusBarsPadding()
                .padding(horizontal = 24.dp, vertical = 20.dp),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text("App limits", color = Color(0xFFCFE6E9), fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(
                    if (rows.isEmpty()) "None set" else "${rows.size} set",
                    color = Color.White,
                    fontSize = 40.sp,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            if (!blockerOn || !usageOn) {
                item { SetupCard(blockerOn, usageOn, context) }
            }
            items(rows, key = { it.limit.pkg }) { row ->
                LimitCard(row) {
                    scope.launch {
                        withContext(Dispatchers.IO) { FocusDb.get(context).limits().delete(row.limit.pkg) }
                        refresh++
                    }
                }
            }
            item {
                Button(onClick = { picking = true }, modifier = Modifier.fillMaxWidth()) {
                    Text("Add a limit")
                }
            }
        }
    }

    if (picking && chosen == null) {
        AppPickerDialog(
            context = context,
            onPick = { chosen = it },
            onDismiss = { picking = false },
        )
    }
    chosen?.let { app ->
        MinutesDialog(
            appLabel = app.label,
            onPick = { minutes ->
                scope.launch {
                    withContext(Dispatchers.IO) {
                        FocusDb.get(context).limits()
                            .upsert(AppLimitEntity(app.pkg, app.label, LimitMath.minutesToMs(minutes)))
                    }
                    chosen = null
                    picking = false
                    refresh++
                }
            },
            onDismiss = {
                chosen = null
                picking = false
            },
        )
    }
}

@Composable
private fun SetupCard(blockerOn: Boolean, usageOn: Boolean, context: Context) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Two switches are needed", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
            if (!usageOn) {
                Text(
                    "1. Usage access: lets Focus measure time per app (same switch as the Usage tab).",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Button(onClick = { open(context, Settings.ACTION_USAGE_ACCESS_SETTINGS) }) { Text("Open usage access") }
            }
            if (!blockerOn) {
                Text(
                    "2. Accessibility: lets Focus see which app is in front, so it can show the \"time's up\" " +
                        "screen. It reads no screen content. On Android 13 and newer, a sideloaded app is greyed " +
                        "out there until you open Settings > Apps > Focus, tap the three dots and choose " +
                        "\"Allow restricted settings\".",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Button(onClick = { open(context, Settings.ACTION_ACCESSIBILITY_SETTINGS) }) { Text("Open accessibility") }
            }
        }
    }
}

private fun open(context: Context, action: String) {
    try {
        context.startActivity(Intent(action))
    } catch (e: ActivityNotFoundException) {
        // Some phones hide the screen; the person can find it in Settings by hand.
    }
}

@Composable
private fun LimitCard(row: LimitRow, onDelete: () -> Unit) {
    val over = LimitMath.isOver(row.usedMs, row.limit.limitMs)
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(start = 16.dp, top = 8.dp, bottom = 8.dp, end = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(row.limit.label, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface, maxLines = 1)
                Text(
                    "${formatDuration(row.usedMs)} of ${formatDuration(row.limit.limitMs)} today" +
                        if (over) " · blocked" else "",
                    color = if (over) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            TextButton(onClick = onDelete) { Text("Remove") }
        }
    }
}

@Composable
private fun AppPickerDialog(context: Context, onPick: (InstalledApp) -> Unit, onDismiss: () -> Unit) {
    var apps by remember { mutableStateOf<List<InstalledApp>?>(null) }
    LaunchedEffect(Unit) { apps = withContext(Dispatchers.IO) { InstalledApps.launchable(context) } }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Choose an app") },
        text = {
            val list = apps
            if (list == null) {
                Text("Loading…")
            } else {
                LazyColumn(Modifier.heightIn(max = 380.dp)) {
                    items(list, key = { it.pkg }) { app ->
                        Text(
                            app.label,
                            Modifier
                                .fillMaxWidth()
                                .clickable { onPick(app) }
                                .padding(vertical = 12.dp),
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun MinutesDialog(appLabel: String, onPick: (Int) -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Daily limit for $appLabel") },
        text = {
            Column {
                for (m in LimitMath.PRESET_MINUTES) {
                    Text(
                        formatDuration(LimitMath.minutesToMs(m)),
                        Modifier
                            .fillMaxWidth()
                            .clickable { onPick(m) }
                            .padding(vertical = 12.dp),
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        },
        confirmButton = {},
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}
