package com.diariovoz.watch

import android.media.AudioAttributes
import android.media.MediaPlayer
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/**
 * Reproduce un archivo de audio. Expone su estado con mutableStateOf,
 * así la pantalla se redibuja sola cuando cambia (playing, positionMs…).
 */
class AudioPlayer {
    private var mp: MediaPlayer? = null

    var playing by mutableStateOf(false); private set
    var positionMs by mutableIntStateOf(0); private set
    var durationMs by mutableIntStateOf(0); private set
    var error by mutableStateOf<String?>(null); private set

    /** Si está sonando, pausa; si no, reproduce (desde donde se quedó). */
    fun toggle(path: String) {
        error = null
        val current = mp
        if (current != null && playing) {
            current.pause()
            playing = false
            return
        }
        try {
            val p = current ?: create(path)
            p.start()
            playing = true
        } catch (e: Exception) {
            error = "No se pudo reproducir"
            release()
        }
    }

    private fun create(path: String): MediaPlayer {
        val p = MediaPlayer()
        try {
            p.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    .build(),
            )
            p.setDataSource(path)
            p.setOnCompletionListener {
                playing = false
                positionMs = 0
                it.seekTo(0) // listo para volver a reproducir desde el inicio
            }
            p.prepare() // el archivo es local y corto, no hace falta prepararlo en segundo plano
            durationMs = p.duration
        } catch (e: Exception) {
            p.release()
            throw e
        }
        mp = p
        return p
    }

    /** Actualiza la posición actual (se llama varias veces por segundo mientras suena). */
    fun refresh() {
        positionMs = try { mp?.currentPosition ?: 0 } catch (e: IllegalStateException) { 0 }
    }

    fun release() {
        mp?.release()
        mp = null
        playing = false
        positionMs = 0
    }
}
