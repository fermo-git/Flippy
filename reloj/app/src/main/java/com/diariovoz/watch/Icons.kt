package com.diariovoz.watch

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Iconos de trazo grueso y puntas redondeadas, dibujados con datos de ruta SVG
 * sobre una cuadrícula de 24 x 24. No dependen de ninguna librería de iconos.
 */
enum class Glyph(val path: String) {
    MIC("M12 3 a3 3 0 0 0 -3 3 v6 a3 3 0 0 0 6 0 V6 a3 3 0 0 0 -3 -3 z M5 11 a7 7 0 0 0 14 0 M12 18 v3"),
    STOP("M7 7 h10 v10 h-10 z"),
    PLAY("M8 5.5 v13 l11 -6.5 z"),
    PAUSE("M8.5 5 v14 M15.5 5 v14"),
    HISTORY("M12 3 a9 9 0 0 1 0 18 a9 9 0 0 1 0 -18 z M12 7 v5 l3 2"),
    BACK("M15 5 l-7 7 l7 7"),
    TRASH("M4 7 h16 M10 11 v6 M14 11 v6 M6 7 l1 12 a2 2 0 0 0 2 2 h6 a2 2 0 0 0 2 -2 l1 -12 M9 7 V4 h6 V7"),
    RETRY("M20 12 a8 8 0 1 1 -2.6 -5.9 M20 4 v5 h-5"),
    SPARKLE("M12 3 l2 7 l7 2 l-7 2 l-2 7 l-2 -7 l-7 -2 l7 -2 z"),

    // Una por emoción (en lugar de colores, para mantener la paleta en blanco y negro)
    SUN("M16 12 a4 4 0 0 1 -8 0 a4 4 0 0 1 8 0 z M12 2 v2 M12 20 v2 M2 12 h2 M20 12 h2 M4.9 4.9 l1.4 1.4 M17.7 17.7 l1.4 1.4 M4.9 19.1 l1.4 -1.4 M17.7 6.3 l1.4 -1.4"),
    WAVES("M3 9 c3 -3 6 3 9 0 s6 3 9 0 M3 15 c3 -3 6 3 9 0 s6 3 9 0"),
    HEART("M12 20 c0 0 -7 -4.5 -7 -10 a4 4 0 0 1 7 -2.5 a4 4 0 0 1 7 2.5 c0 5.5 -7 10 -7 10 z"),
    DROP("M12 3 c0 0 6 6.5 6 11 a6 6 0 0 1 -12 0 c0 -4.5 6 -11 6 -11 z"),
    BOLT("M13 3 l-8 10 h6 l-1 8 l8 -10 h-6 z"),
    FLAME("M12 3 c1 4 5 5.5 5 10 a5 5 0 0 1 -10 0 c0 -2 1 -3.5 2 -4.5 c0 2 1 3 2 3 c0 -3 -1 -5 1 -8.5 z"),
    MOON("M12 3 a6 6 0 0 0 9 9 a9 9 0 1 1 -9 -9 z"),
    DOT("M12 8 a4 4 0 0 1 0 8 a4 4 0 0 1 0 -8 z"),
}

fun Emotion.glyph(): Glyph = when (this) {
    Emotion.ALEGRIA -> Glyph.SUN
    Emotion.CALMA -> Glyph.WAVES
    Emotion.GRATITUD -> Glyph.HEART
    Emotion.TRISTEZA -> Glyph.DROP
    Emotion.ANSIEDAD -> Glyph.BOLT
    Emotion.ENOJO -> Glyph.FLAME
    Emotion.CANSANCIO -> Glyph.MOON
    Emotion.OTRA -> Glyph.DOT
}

@Composable
fun AppIcon(
    glyph: Glyph,
    modifier: Modifier = Modifier,
    tint: Color = Color.White,
    iconSize: Dp = 20.dp,
    strokeWidth: Float = 2.4f, // en unidades de la cuadrícula de 24
) {
    val path = remember(glyph) { PathParser().parsePathString(glyph.path).toPath() }
    Canvas(modifier.size(iconSize)) {
        val s = this.size.width / 24f
        scale(s, pivot = Offset.Zero) {
            drawPath(path, tint, style = Stroke(width = strokeWidth, cap = StrokeCap.Round, join = StrokeJoin.Round))
        }
    }
}
