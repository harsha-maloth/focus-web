package app.focus.harsha.ui

/** 2_700_000 -> "45 min", 3_600_000 -> "1 h", 7_500_000 -> "2 h 5 min". Same wording as the web app. */
fun formatDuration(ms: Long): String {
    val totalMinutes = (ms.coerceAtLeast(0L) / 60_000L).toInt()
    val hours = totalMinutes / 60
    val minutes = totalMinutes % 60
    if (hours == 0) return "$minutes min"
    return if (minutes == 0) "$hours h" else "$hours h $minutes min"
}
