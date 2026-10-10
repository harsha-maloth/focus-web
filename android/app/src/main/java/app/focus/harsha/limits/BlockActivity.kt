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

/** Full-screen block page shown over a limited or not-allowed app. Back and the button both go Home. */
class BlockActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "Time's up"
        val message = intent.getStringExtra(EXTRA_MESSAGE) ?: "This app is blocked right now."
        setContent {
            FocusTheme {
                BackHandler { goHome() }
                BlockScreen(title, message, onHome = ::goHome)
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
        const val EXTRA_TITLE = "title"
        const val EXTRA_MESSAGE = "message"
    }
}

@Composable
private fun BlockScreen(title: String, message: String, onHome: () -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .background(HeaderTeal)
            .padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(title, color = Color.White, fontSize = 32.sp, fontWeight = FontWeight.Bold)
        Text(
            message,
            color = Color(0xFFCFE6E9),
            fontSize = 16.sp,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(vertical = 20.dp),
        )
        Button(onClick = onHome) { Text("Go home") }
    }
}
