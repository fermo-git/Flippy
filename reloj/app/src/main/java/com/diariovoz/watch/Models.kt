package com.diariovoz.watch

import java.text.Normalizer

/** Las emociones que puede detectar la IA. Mismo conjunto que la app del teléfono. */
enum class Emotion(val label: String) {
    ALEGRIA("alegría"),
    CALMA("calma"),
    GRATITUD("gratitud"),
    TRISTEZA("tristeza"),
    ANSIEDAD("ansiedad"),
    ENOJO("enojo"),
    CANSANCIO("cansancio"),
    OTRA("otra");

    companion object {
        /** Convierte cualquier texto ("Alegria", " ALEGRÍA ") en una Emotion; si no la reconoce, OTRA. */
        fun from(raw: String?): Emotion {
            if (raw == null) return OTRA
            val clean = raw.trim().lowercase().stripAccents()
            return entries.firstOrNull { it.label.stripAccents() == clean } ?: OTRA
        }
    }
}

/** PENDING = grabada pero sin procesar · READY = con resumen · ERROR = falló y se puede reintentar. */
enum class Status { PENDING, READY, ERROR }

/** Resultado del análisis de la IA. */
data class Analysis(
    val summary: String,
    val emotion: Emotion,
    val topics: List<String>,
)

/** Una nota del diario. `data class` = Kotlin crea gratis copy(), equals(), toString(). */
data class Entry(
    val id: Long,
    val createdAt: Long, // milisegundos desde 1970
    val audioPath: String,
    val durationSec: Int,
    val transcript: String = "",
    val summary: String = "",
    val emotion: Emotion = Emotion.OTRA,
    val topics: List<String> = emptyList(),
    val status: Status = Status.PENDING,
    val error: String? = null,
)

fun String.stripAccents(): String =
    Normalizer.normalize(this, Normalizer.Form.NFD).replace(Regex("\\p{M}+"), "")

/** Limpia lo que devuelva la IA (puede venir incompleto o raro) y lo convierte en un Analysis seguro. */
fun buildAnalysis(summary: String?, emotion: String?, topics: List<String>?): Analysis =
    Analysis(
        summary = summary?.trim().orEmpty().ifEmpty { "Sin resumen disponible." },
        emotion = Emotion.from(emotion),
        topics = topics.orEmpty().map { it.trim().lowercase() }.filter { it.isNotEmpty() }.take(4),
    )
