package com.diariovoz.watch

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.wear.compose.material3.MaterialTheme
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController

class MainActivity : ComponentActivity() {
    private val vm: DiaryViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                DiaryApp(vm)
            }
        }
    }
}

/** Mapa de pantallas. Deslizar hacia la derecha = volver atrás (gesto estándar de Wear OS). */
@Composable
fun DiaryApp(vm: DiaryViewModel) {
    val nav = rememberSwipeDismissableNavController()
    val spaceTime = rememberSpaceTime() // un solo reloj para el cielo de todas las pantallas

    CompositionLocalProvider(LocalSpaceTime provides spaceTime) {
        SwipeDismissableNavHost(navController = nav, startDestination = "home") {
            composable("home") {
                HomeScreen(
                    vm = vm,
                    onRecord = { nav.navigate("record") },
                    onHistory = { nav.navigate("history") },
                )
            }
            composable("record") {
                RecordScreen(
                    vm = vm,
                    onOpen = { id -> nav.navigate("detail/$id") { popUpTo("home") } },
                    onBack = { nav.popBackStack() },
                )
            }
            composable("history") {
                HistoryScreen(
                    vm = vm,
                    onOpen = { id -> nav.navigate("detail/$id") },
                    onBack = { nav.popBackStack() },
                )
            }
            composable("detail/{id}") { entry ->
                val id = entry.arguments?.getString("id")?.toLongOrNull()
                if (id != null) DetailScreen(vm = vm, id = id, onBack = { nav.popBackStack() })
            }
        }
    }
}
