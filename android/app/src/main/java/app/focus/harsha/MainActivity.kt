package app.focus.harsha

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.Box
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import app.focus.harsha.ui.FocusScreen
import app.focus.harsha.ui.FocusTheme
import app.focus.harsha.ui.HomeScreen
import app.focus.harsha.ui.LimitsScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // The headers are always dark teal, so the status bar icons are always light.
        enableEdgeToEdge(statusBarStyle = SystemBarStyle.dark(android.graphics.Color.TRANSPARENT))
        setContent {
            FocusTheme {
                var tab by rememberSaveable { mutableIntStateOf(0) }
                Column(Modifier.fillMaxSize()) {
                    Box(Modifier.weight(1f)) {
                        when (tab) {
                            0 -> FocusScreen()
                            1 -> HomeScreen()
                            else -> LimitsScreen()
                        }
                    }
                    NavigationBar {
                        NavigationBarItem(selected = tab == 0, onClick = { tab = 0 }, icon = {}, label = { Text("Focus") })
                        NavigationBarItem(selected = tab == 1, onClick = { tab = 1 }, icon = {}, label = { Text("Usage") })
                        NavigationBarItem(selected = tab == 2, onClick = { tab = 2 }, icon = {}, label = { Text("Limits") })
                    }
                }
            }
        }
    }
}
