package com.diariovoz.watch

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.sin

/**
 * Reloj compartido de la animación (0 → 1 cada 24 s). Vive en DiaryApp y se reparte a todas
 * las pantallas, así el cielo no "se reinicia" al navegar entre ellas.
 */
val LocalSpaceTime = compositionLocalOf<State<Float>> {
    object : State<Float> {
        override val value: Float = 0f
    }
}

@Composable
fun rememberSpaceTime(): State<Float> {
    val transition = rememberInfiniteTransition(label = "space")
    return transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(24_000, easing = LinearEasing)),
        label = "time",
    )
}

private data class Star(val x: Float, val y: Float, val radius: Float, val phase: Float, val speed: Int)

// Estrellas sueltas: posiciones pseudoaleatorias pero siempre las mismas.
private val stars: List<Star> = run {
    var seed = 7L
    fun next(): Float {
        seed = (seed * 1103515245L + 12345L) and 0x7fffffffL
        return (seed % 10_000L) / 10_000f
    }
    List(34) {
        Star(
            x = next(),
            y = next(),
            radius = 0.5f + next() * 1.3f,
            phase = next() * 2f * PI.toFloat(),
            speed = 1 + (next() * 3).toInt(), // entero → el parpadeo cierra el ciclo sin saltos
        )
    }
}

// Constelaciones: cadenas de puntos (coordenadas de 0 a 1), repartidas por el borde de la pantalla.
private val constellations: List<List<Offset>> = listOf(
    listOf(Offset(0.10f, 0.34f), Offset(0.18f, 0.22f), Offset(0.30f, 0.15f), Offset(0.42f, 0.10f), Offset(0.40f, 0.20f)),
    listOf(Offset(0.90f, 0.60f), Offset(0.82f, 0.73f), Offset(0.70f, 0.82f), Offset(0.58f, 0.90f)),
    listOf(Offset(0.74f, 0.12f), Offset(0.86f, 0.24f), Offset(0.90f, 0.40f)),
    listOf(Offset(0.10f, 0.64f), Offset(0.22f, 0.74f), Offset(0.18f, 0.88f), Offset(0.32f, 0.92f)),
)

/** Cielo nocturno: estrellas que titilan y constelaciones que se dibujan y se desvanecen. */
@Composable
fun SpaceBackground() {
    val time = LocalSpaceTime.current
    Canvas(Modifier.fillMaxSize()) {
        val t = time.value // se lee aquí dentro: solo se redibuja el lienzo, no toda la pantalla
        val w = size.width
        val h = size.height

        for (s in stars) {
            val twinkle = 0.5f + 0.5f * sin(2f * PI.toFloat() * (s.speed * 4) * t + s.phase)
            drawCircle(
                color = Color.White.copy(alpha = 0.12f + 0.38f * twinkle),
                radius = s.radius.dp.toPx(),
                center = Offset(s.x * w, s.y * h),
            )
        }

        constellations.forEachIndexed { k, pts ->
            val cycle = (t + k * 0.25f) % 1f
            val grow = (cycle / 0.55f).coerceIn(0f, 1f) // 0 → 55 % del ciclo: se va trazando
            val fade = if (cycle < 0.8f) 1f else 1f - (cycle - 0.8f) / 0.2f // último 20 %: se apaga
            val segments = pts.size - 1

            for (i in 0 until segments) {
                val progress = (grow * segments - i).coerceIn(0f, 1f)
                if (progress <= 0f) continue
                val a = Offset(pts[i].x * w, pts[i].y * h)
                val b = Offset(pts[i + 1].x * w, pts[i + 1].y * h)
                val end = Offset(a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress)
                drawLine(
                    color = Color.White.copy(alpha = 0.32f * fade),
                    start = a,
                    end = end,
                    strokeWidth = 1.dp.toPx(),
                    cap = StrokeCap.Round,
                )
            }
            pts.forEachIndexed { i, p ->
                val reached = grow * segments >= i - 0.001f
                if (reached) {
                    drawCircle(
                        color = Color.White.copy(alpha = 0.25f + 0.6f * fade),
                        radius = 2.dp.toPx(),
                        center = Offset(p.x * w, p.y * h),
                    )
                }
            }
        }
    }
}

/** Marco de cada pantalla: fondo negro + cielo animado + el contenido encima. */
@Composable
fun SpaceScreen(content: @Composable BoxScope.() -> Unit) {
    Box(Modifier.fillMaxSize().background(Color.Black)) {
        SpaceBackground()
        content()
    }
}
