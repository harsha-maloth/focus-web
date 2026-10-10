package app.focus.harsha.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Same tokens as the web app (web/src/index.css), so both products look like one family.
val HeaderTeal = Color(0xFF0B5563)

private val LightColors = lightColorScheme(
    primary = Color(0xFF0B5563),
    onPrimary = Color(0xFFFFFFFF),
    secondary = Color(0xFFE54F2A),
    background = Color(0xFFE4ECE9),
    onBackground = Color(0xFF12202B),
    surface = Color(0xFFF6F9F8),
    onSurface = Color(0xFF12202B),
    surfaceVariant = Color(0xFFD3E1DD),
    onSurfaceVariant = Color(0xFF53656D),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF5CC2CF),
    onPrimary = Color(0xFF06232A),
    secondary = Color(0xFFFF7A59),
    background = Color(0xFF0C1519),
    onBackground = Color(0xFFE3ECEA),
    surface = Color(0xFF132127),
    onSurface = Color(0xFFE3ECEA),
    surfaceVariant = Color(0xFF1B2E35),
    onSurfaceVariant = Color(0xFF9BB0B3),
)

@Composable
fun FocusTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        content = content,
    )
}
