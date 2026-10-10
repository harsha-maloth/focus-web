package app.focus.harsha.limits

import android.content.Context
import android.content.Intent

data class InstalledApp(val pkg: String, val label: String)

object InstalledApps {
    /** Apps with a launcher icon, except Focus itself, sorted by name. */
    fun launchable(context: Context): List<InstalledApp> {
        val pm = context.packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        return pm.queryIntentActivities(intent, 0)
            .map { InstalledApp(it.activityInfo.packageName, it.loadLabel(pm).toString()) }
            .filter { it.pkg != context.packageName }
            .distinctBy { it.pkg }
            .sortedBy { it.label.lowercase() }
    }
}
