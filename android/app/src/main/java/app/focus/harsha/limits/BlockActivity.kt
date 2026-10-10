package app.focus.harsha.limits

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.focus.harsha.ui.FocusTheme
import app.focus.harsha.ui.HeaderTeal

/** Full-screen "limit reached" page shown over a limited app. Back and the button both go Home. */
class BlockActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val label = intent.getStringExtra(EXTRA_LABEL) ?: "This app"
        setContent {
            FocusTheme {
                BackHandler { goHome() }
                BlockScreen(label, onHome = ::goHome)
            }
        }
    }

    private fun goHome() {
        startActivity(
            Intent(Intent.ACTION_MAIN)
                .addCategory(Intent.CATEGORY_HOME)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
        )
        finish()
    }

    companion object {
        const val EXTRA_LABEL = "label"
    }
}

@Composable
private fun BlockScreen(label: String, onHome: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .background(HeaderTeal)
            .padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("Time's up", color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Bold)
        Text(
            "You reached today's limit for $label. It opens again tomorrow, or change the limit in Focus.",
            color = Color(0xFFCFE6E9),
            fontSize = 16.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(vertical = 20.dp),
        )
        Button(onClick = onHome) { Text("Go home") }
    }
}
