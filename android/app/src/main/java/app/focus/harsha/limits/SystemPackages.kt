package app.focus.harsha.limits

import android.content.Context
import android.content.Intent
import android.telecom.TelecomManager
import android.view.inputmethod.InputMethodManager

/**
 * Packages that must never be blocked: System UI, the home screen, the keyboard (typing in an
 * allowed app opens the keyboard window, which would otherwise count as another app) and the
 * default phone app.
 */
object SystemPackages {
    fun ignored(context: Context): Set<String> {
        val out = HashSet<String>()
        out += "com.android.systemui"
        out += "android"
        try {
            val home = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            context.packageManager.queryIntentActivities(home, 0).forEach { out += it.activityInfo.packageName }
        } catch (e: Exception) {
            // Keep going with what we have.
        }
        try {
            val imm = context.getSystemService(Context.INPUT_METHOD_SERVICE) as InputMethodManager
            imm.enabledInputMethodList.forEach { out += it.packageName }
        } catch (e: Exception) {
        }
        try {
            val telecom = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
            telecom.defaultDialerPackage?.let { out += it }
        } catch (e: Exception) {
        }
        return out
    }
}
