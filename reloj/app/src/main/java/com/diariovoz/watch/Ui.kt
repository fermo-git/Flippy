package com.diariovoz.watch

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material3.Text
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Locale
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/** Paleta: solo blancos, negros y grises. */
object Palette {
    val Text = Color(0xFFF5F5F7)
    val Muted = Color(0xFF8E8E93)
    val Dim = Color(0xFF48484D)
    val Edge = Color(0xFF3A3A3F)
    val Glass = Color(0xD9101012) // negro translúcido: deja ver un poco las estrellas
}

fun formatTime(totalSeconds: Int): String = "%d:%02d".format(totalSeconds / 60, totalSeconds % 60)

fun formatDate(millis: Long): String =
    SimpleDateFormat("EEE d MMM · HH:mm", Locale.forLanguageTag("es-MX")).format(millis)

/**
 * Botón principal: un "planeta" blanco con una órbita fina y una luna que gira.
 * Al grabar, aparece un halo que respira con el volumen de la voz y una segunda luna.
 */
@Composable
fun RecordOrb(recording: Boolean, level: Float, onClick: () -> Unit, diameter: Int = 56) {
    val smooth by animateFloatAsState(targetValue = level, label = "level")
    val transition = rememberInfiniteTransition(label = "orbit")
    val angle by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(9000, easing = LinearEasing), RepeatMode.Restart),
        label = "angle",
    )

    Box(contentAlignment = Alignment.Center, modifier = Modifier.size((diameter + 24).dp)) {
        Canvas(Modifier.fillMaxSize()) {
            val c = center
            val coreR = diameter.dp.toPx() / 2f
            val orbitR = coreR + 9.dp.toPx()

            if (recording) {
                drawCircle(Color.White.copy(alpha = 0.16f), radius = coreR * (1.12f + smooth * 0.5f), center = c)
            }
            drawCircle(Palette.Dim, radius = orbitR, center = c, style = Stroke(width = 1.dp.toPx()))

            val rad = angle * (PI.toFloat() / 180f)
            drawCircle(
                Color.White,
                radius = 2.3.dp.toPx(),
                center = Offset(c.x + orbitR * cos(rad), c.y + orbitR * sin(rad)),
            )
            if (recording) {
                drawCircle(
                    Palette.Muted,
                    radius = 1.8.dp.toPx(),
                    center = Offset(c.x - orbitR * cos(rad), c.y - orbitR * sin(rad)),
                )
            }
        }
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(diameter.dp)
                .clip(CircleShape)
                .background(Color.White)
                .clickable(onClickLabel = if (recording) "Detener grabación" else "Grabar", onClick = onClick),
        ) {
            AppIcon(
                glyph = if (recording) Glyph.STOP else Glyph.MIC,
                tint = Color.Black,
                iconSize = (diameter * 0.46f).dp,
            )
        }
    }
}

/** Indicador de carga: una órbita gris con un arco blanco que gira. */
@Composable
fun Spinner(modifier: Modifier = Modifier, diameter: Int = 36) {
    val transition = rememberInfiniteTransition(label = "spinner")
    val angle by transition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(1000, easing = LinearEasing), RepeatMode.Restart),
        label = "angle",
    )
    Canvas(modifier.size(diameter.dp)) {
        val stroke = 3.dp.toPx()
        val topLeft = Offset(stroke / 2, stroke / 2)
        val arcSize = Size(this.size.width - stroke, this.size.height - stroke)
        drawArc(
            color = Palette.Dim, startAngle = 0f, sweepAngle = 360f, useCenter = false,
            topLeft = topLeft, size = arcSize, style = Stroke(width = stroke),
        )
        drawArc(
            color = Color.White, startAngle = angle, sweepAngle = 100f, useCenter = false,
            topLeft = topLeft, size = arcSize, style = Stroke(width = stroke, cap = StrokeCap.Round),
        )
    }
}

/**
 * Botón en forma de píldora (altura mínima táctil de 44 dp).
 * Normal: cristal oscuro con borde gris. `primary`: blanco con texto negro.
 */
@Composable
fun ActionPill(text: String, onClick: () -> Unit, icon: Glyph? = null, primary: Boolean = false) {
    val shape = RoundedCornerShape(50)
    val foreground = if (primary) Color.Black else Palette.Text
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
        modifier = Modifier
            .heightIn(min = 44.dp)
            .clip(shape)
            .background(if (primary) Color.White else Palette.Glass)
            .border(1.dp, if (primary) Color.White else Palette.Edge, shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        if (icon != null) AppIcon(icon, tint = foreground, iconSize = 16.dp)
        Text(text, fontSize = 13.sp, fontWeight = FontWeight.Medium, color = foreground)
    }
}

/** Botón redondo de reproducir/pausar. */
@Composable
fun PlayPauseButton(playing: Boolean, onClick: () -> Unit, diameter: Int = 40) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .size(diameter.dp)
            .clip(CircleShape)
            .background(Color.White)
            .clickable(onClickLabel = if (playing) "Pausar" else "Reproducir", onClick = onClick),
    ) {
        AppIcon(if (playing) Glyph.PAUSE else Glyph.PLAY, tint = Color.Black, iconSize = (diameter * 0.5f).dp)
    }
}

/** Reproductor de una nota: botón, línea de progreso con una estrella en la punta, y tiempo. */
@Composable
fun PlayerRow(path: String, fallbackSeconds: Int) {
    val player = remember { AudioPlayer() }
    DisposableEffect(Unit) { onDispose { player.release() } }

    // Mientras suena, refrescamos la posición 5 veces por segundo.
    LaunchedEffect(player.playing) {
        while (player.playing) {
            player.refresh()
            delay(200)
        }
    }

    val totalSeconds = if (player.durationMs > 0) player.durationMs / 1000 else fallbackSeconds
    val fraction = if (player.durationMs > 0) player.positionMs.toFloat() / player.durationMs else 0f

    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        PlayPauseButton(playing = player.playing, onClick = { player.toggle(path) })
        Canvas(Modifier.fillMaxWidth(0.6f).height(8.dp)) {
            val y = this.size.height / 2f
            val x = this.size.width * fraction.coerceIn(0f, 1f)
            val stroke = 2.dp.toPx()
            drawLine(Palette.Dim, Offset(0f, y), Offset(this.size.width, y), strokeWidth = stroke, cap = StrokeCap.Round)
            drawLine(Color.White, Offset(0f, y), Offset(x, y), strokeWidth = stroke, cap = StrokeCap.Round)
            drawCircle(Color.White, radius = 3.dp.toPx(), center = Offset(x, y))
        }
        Text("${formatTime(player.positionMs / 1000)} / ${formatTime(totalSeconds)}", fontSize = 10.sp, color = Palette.Muted)
        player.error?.let { Text(it, fontSize = 10.sp, color = Palette.Muted) }
    }
}

/** Insignia circular con el icono de una emoción. */
@Composable
fun EmotionBadge(glyph: Glyph, badge: Int = 32) {
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier.size(badge.dp).clip(CircleShape).border(1.dp, Palette.Edge, CircleShape),
    ) {
        AppIcon(glyph, iconSize = (badge * 0.56f).dp)
    }
}

/** Fila de una nota: icono de su emoción + fecha + resumen corto. */
@Composable
fun EntryRow(entry: Entry, onClick: () -> Unit) {
    val ready = entry.status == Status.READY
    val shape = RoundedCornerShape(18.dp)
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp)
            .clip(shape)
            .background(Palette.Glass)
            .border(1.dp, Palette.Edge, shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 8.dp),
    ) {
        EmotionBadge(
            when {
                ready -> entry.emotion.glyph()
                entry.status == Status.ERROR -> Glyph.RETRY
                else -> Glyph.DOT
            },
        )
        Column(Modifier.weight(1f)) {
            Text(formatDate(entry.createdAt), fontSize = 10.sp, color = Palette.Muted)
            Text(
                text = when {
                    ready -> entry.summary
                    entry.status == Status.ERROR -> "No se pudo procesar. Toca para reintentar."
                    else -> "Procesando…"
                },
                fontSize = 12.sp,
                color = Palette.Text,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
