package app.focus.harsha.ui

import android.content.ActivityNotFoundException
import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import app.focus.harsha.data.AllowedAppEntity
import app.focus.harsha.data.FocusDb
import app.focus.harsha.data.FocusSessionEntity
import app.focus.harsha.limits.AccessibilityStatus
import app.focus.harsha.limits.SessionMath
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private fun clock(ms: Long): String {
    val total = (ms / 1000L).toInt()
    return "%02d:%02d".format(Locale.US, total / 60, total % 60)
}

@Composable
fun FocusScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val db = remember { FocusDb.get(context) }

    var refresh by remember { mutableIntStateOf(0) }
    var running by remember { mutableStateOf<FocusSessionEntity?>(null) }
    var allowed by remember { mutableStateOf<List<AllowedAppEntity>>(emptyList()) }
    var recent by remember { mutableStateOf<List<FocusSessionEntity>>(emptyList()) }
    var minutes by remember { mutableIntStateOf(25) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    var blockerOn by remember { mutableStateOf(AccessibilityStatus.isBlockerEnabled(context)) }
    var confirmEnd by remember { mutableStateOf(false) }
    var picking by remember { mutableStateOf(false) }

    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        blockerOn = AccessibilityStatus.isBlockerEnabled(context)
        refresh++
    }

    LaunchedEffect(refresh) {
        withContext(Dispatchers.IO) {
            running = db.sessions().running()
            allowed = db.allowed().all()
            recent = db.sessions().recent(8)
        }
    }

    // Tick once a second while a session runs; finish it when the time is up.
    LaunchedEffect(running?.id) {
        val s = running ?: return@LaunchedEffect
        while (true) {
            now = System.currentTimeMillis()
            if (SessionMath.isFinished(s.startMs, s.plannedMs, now)) {
                withContext(Dispatchers.IO) {
                    db.sessions().finish(s.id, SessionMath.plannedEndMs(s.startMs, s.plannedMs), "completed")
                }
                refresh++
                return@LaunchedEffect
            }
            delay(1000)
        }
    }

    val session = running
    val headline = if (session != null) clock(SessionMath.remainingMs(session.startMs, session.plannedMs, now)) else "Ready"

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
                Text(
                    if (session != null) "Focus session, time left" else "Focus",
                    color = Color(0xFFCFE6E9),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(headline, color = Color.White, fontSize = 40.sp, fontWeight = FontWeight.Bold)
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (!blockerOn) {
                item {
                    Panel {
                        Text("Blocking is off", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                        Text(
                            "Sessions are timed, but other apps are not blocked until you switch on the Focus " +
                                "accessibility service (see the Limits tab for the steps).",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        OutlinedButton(onClick = {
                            try {
                                context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                            } catch (e: ActivityNotFoundException) {
                            }
                        }) { Text("Open accessibility") }
                    }
                }
            }

            if (session == null) {
                item {
                    Panel {
                        Text("Length", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            for (m in SessionMath.PRESET_MINUTES.take(3)) {
                                FilterChip(selected = minutes == m, onClick = { minutes = m }, label = { Text("$m min") })
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            for (m in SessionMath.PRESET_MINUTES.drop(3)) {
                                FilterChip(selected = minutes == m, onClick = { minutes = m }, label = { Text("$m min") })
                            }
                        }
                        Button(
                            onClick = {
                                scope.launch {
                                    withContext(Dispatchers.IO) {
                                        if (db.sessions().running() == null) {
                                            db.sessions().insert(
                                                FocusSessionEntity(
                                                    startMs = System.currentTimeMillis(),
                                                    plannedMs = minutes * 60_000L,
                                                    endMs = null,
                                                    status = "running",
                                                ),
                                            )
                                        }
                                    }
                                    now = System.currentTimeMillis()
                                    refresh++
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                        ) { Text("Start $minutes min") }
                    }
                }
            } else {
                item {
                    Panel {
                        Text(
                            "Only Focus, your phone essentials and the allowed apps work until the timer ends.",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        OutlinedButton(onClick = { confirmEnd = true }, modifier = Modifier.fillMaxWidth()) { Text("End early") }
                    }
                }
            }

            item {
                Panel {
                    Text("Allowed during a session", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    if (allowed.isEmpty()) {
                        Text("No apps. The phone app, keyboard and home screen always work.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    for (a in allowed) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(a.label, color = MaterialTheme.colorScheme.onSurface, modifier = Modifier.padding(top = 12.dp))
                            TextButton(onClick = {
                                scope.launch {
                                    withContext(Dispatchers.IO) { db.allowed().delete(a.pkg) }
                                    refresh++
                                }
                            }) { Text("Remove") }
                        }
                    }
                    OutlinedButton(onClick = { picking = true }) { Text("Add an app") }
                }
            }

            if (recent.isNotEmpty()) {
                item { Text("Recent sessions", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface) }
                items(recent, key = { it.id }) { s -> SessionRow(s) }
            }
        }
    }

    if (confirmEnd && session != null) {
        AlertDialog(
            onDismissRequest = { confirmEnd = false },
            title = { Text("End this session?") },
            text = { Text("It will be saved as ended early, with the time so far.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmEnd = false
                    scope.launch {
                        withContext(Dispatchers.IO) {
                            db.sessions().finish(session.id, System.currentTimeMillis(), "ended_early")
                        }
                        refresh++
                    }
                }) { Text("End it") }
            },
            dismissButton = { TextButton(onClick = { confirmEnd = false }) { Text("Keep going") } },
        )
    }

    if (picking) {
        AppPickerDialog(
            context = context,
            onPick = { app ->
                picking = false
                scope.launch {
                    withContext(Dispatchers.IO) { db.allowed().upsert(AllowedAppEntity(app.pkg, app.label)) }
                    refresh++
                }
            },
            onDismiss = { picking = false },
        )
    }
}

@Composable
private fun Panel(content: @Composable () -> Unit) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) { content() }
    }
}

private val dayFormat = DateTimeFormatter.ofPattern("EEE d MMM, HH:mm", Locale.getDefault())

@Composable
private fun SessionRow(s: FocusSessionEntity) {
    val credited = SessionMath.creditedMs(s.startMs, s.plannedMs, s.endMs ?: s.startMs)
    val whenText = dayFormat.format(Instant.ofEpochMilli(s.startMs).atZone(ZoneId.systemDefault()))
    val status = if (s.status == "completed") "Completed" else "Ended early"
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text(whenText, color = MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.SemiBold)
                Text(status, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text(
                "${formatDuration(credited)} of ${formatDuration(s.plannedMs)}",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
