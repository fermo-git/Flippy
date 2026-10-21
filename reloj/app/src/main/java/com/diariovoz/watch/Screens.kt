package com.diariovoz.watch

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.material3.Text
import java.io.File

/** Pantalla principal: cabe completa en una pantalla redonda pequeña, sin scroll. */
@Composable
fun HomeScreen(
    vm: DiaryViewModel,
    onRecord: () -> Unit,
    onHistory: () -> Unit,
) {
    val context = LocalContext.current

    fun startAndGo() {
        vm.startRecording()
        if (vm.phase == Phase.RECORDING) onRecord()
    }

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) startAndGo()
    }

    fun requestRecord() {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED
        if (granted) startAndGo() else permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
    }

    val notice = vm.notice

    SpaceScreen {
        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp, vertical = 14.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                AppIcon(Glyph.SPARKLE, tint = Palette.Muted, iconSize = 12.dp)
                Text("Diario de voz", fontSize = 12.sp, color = Palette.Muted)
            }
            RecordOrb(recording = false, level = 0f, onClick = { requestRecord() }, diameter = 54)
            when {
                notice != null -> Text(notice, fontSize = 11.sp, color = Palette.Muted, textAlign = TextAlign.Center, maxLines = 2)
                vm.entries.isNotEmpty() -> ActionPill("Historial (${vm.entries.size})", onClick = onHistory, icon = Glyph.HISTORY)
                else -> Text("Toca para grabar", fontSize = 11.sp, color = Palette.Muted)
            }
        }
    }
}

/** Grabando… y luego "procesando". Cuando termina, abre el detalle de la nota. */
@Composable
fun RecordScreen(vm: DiaryViewModel, onOpen: (Long) -> Unit, onBack: () -> Unit) {
    // Si el usuario sale deslizando mientras graba, se descarta la grabación.
    DisposableEffect(Unit) { onDispose { vm.cancelRecording() } }

    // `done` evita que esta pantalla navegue dos veces mientras se anima la transición.
    var done by remember { mutableStateOf(false) }
    LaunchedEffect(vm.phase, vm.openEntryId) {
        if (done) return@LaunchedEffect
        val id = vm.openEntryId
        if (id != null) {
            done = true
            vm.consumeOpen()
            onOpen(id) // nota lista → abrir su detalle
        } else if (vm.phase == Phase.IDLE) {
            done = true
            onBack() // nota muy corta: no se creó nada, volvemos al inicio
        }
    }

    SpaceScreen {
        Box(Modifier.fillMaxSize().padding(horizontal = 20.dp), contentAlignment = Alignment.Center) {
            if (vm.phase == Phase.PROCESSING) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Spinner()
                    Text("Leyendo las estrellas…", fontSize = 14.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                    Text("Transcribiendo y analizando", fontSize = 11.sp, color = Palette.Muted, textAlign = TextAlign.Center)
                }
            } else {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(formatTime(vm.seconds), fontSize = 26.sp, fontWeight = FontWeight.Bold)
                    RecordOrb(recording = true, level = vm.level, onClick = { vm.finishRecording() }, diameter = 58)
                    Text("Toca para terminar", fontSize = 11.sp, color = Palette.Muted)
                }
            }
        }
    }
}

/** Detalle de una nota: reproductor, emoción, resumen, temas, transcripción y acciones. */
@Composable
fun DetailScreen(vm: DiaryViewModel, id: Long, onBack: () -> Unit) {
    val entry = vm.entries.firstOrNull { it.id == id }
    if (entry == null) { // se borró
        LaunchedEffect(Unit) { onBack() }
        return
    }
    var confirmDelete by remember { mutableStateOf(false) }

    SpaceScreen {
        ScalingLazyColumn(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                Text(
                    "${formatDate(entry.createdAt)} · ${formatTime(entry.durationSec)}",
                    fontSize = 11.sp, color = Palette.Muted, textAlign = TextAlign.Center,
                )
            }

            if (File(entry.audioPath).exists()) {
                item { PlayerRow(path = entry.audioPath, fallbackSeconds = entry.durationSec) }
            }

            if (entry.status == Status.READY) {
                item {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        EmotionBadge(entry.emotion.glyph(), badge = 30)
                        Text(entry.emotion.label, fontSize = 16.sp, fontWeight = FontWeight.Bold)
                    }
                }
                item { Text(entry.summary, fontSize = 13.sp, textAlign = TextAlign.Center) }
                if (entry.topics.isNotEmpty()) {
                    item {
                        Text(entry.topics.joinToString(" · "), fontSize = 11.sp, color = Palette.Muted, textAlign = TextAlign.Center)
                    }
                }
                if (entry.transcript.isNotBlank()) {
                    item { Text("TRANSCRIPCIÓN", fontSize = 9.sp, color = Palette.Muted, fontWeight = FontWeight.Bold, letterSpacing = 1.sp) }
                    item { Text(entry.transcript, fontSize = 11.sp, textAlign = TextAlign.Center) }
                }
            } else {
                item {
                    Text(
                        if (entry.status == Status.ERROR) "No se pudo procesar" else "Nota sin procesar",
                        fontSize = 14.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center,
                    )
                }
                entry.error?.let {
                    item { Text(it, fontSize = 11.sp, color = Palette.Muted, textAlign = TextAlign.Center) }
                }
                item {
                    if (vm.busyId == entry.id) {
                        Spinner()
                    } else {
                        ActionPill("Reintentar", onClick = { vm.retry(entry.id) }, icon = Glyph.RETRY, primary = true)
                    }
                }
            }

            item { ActionPill("Volver", onClick = onBack, icon = Glyph.BACK) }

            item {
                if (confirmDelete) {
                    ActionPill("¿Seguro? Toca otra vez", onClick = { vm.delete(entry.id) }, icon = Glyph.TRASH, primary = true)
                } else {
                    ActionPill("Borrar", onClick = { confirmDelete = true }, icon = Glyph.TRASH)
                }
            }
        }
    }
}

/** Lista de todas las notas. */
@Composable
fun HistoryScreen(vm: DiaryViewModel, onOpen: (Long) -> Unit, onBack: () -> Unit) {
    SpaceScreen {
        ScalingLazyColumn(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    AppIcon(Glyph.HISTORY, tint = Palette.Muted, iconSize = 12.dp)
                    Text("Historial", fontSize = 12.sp, color = Palette.Muted)
                }
            }
            vm.entries.forEach { entry ->
                item(key = entry.id) { EntryRow(entry, onClick = { onOpen(entry.id) }) }
            }
            item { ActionPill("Volver", onClick = onBack, icon = Glyph.BACK) }
        }
    }
}
