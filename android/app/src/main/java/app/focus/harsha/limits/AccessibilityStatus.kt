package app.focus.harsha.limits

import android.content.ComponentName
import android.content.Context
import android.provider.Settings

object AccessibilityStatus {
    /** True once the person has switched the Focus blocker on in Settings > Accessibility. */
    fun isBlockerEnabled(context: Context): Boolean {
        val enabled = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES,
        ) ?: return false
        val mine = ComponentName(context, BlockerService::class.java)
        return enabled.split(':').any {
            val c = ComponentName.unflattenFromString(it)
            c != null && c == mine
        }
    }
}
