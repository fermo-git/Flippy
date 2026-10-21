package com.diariovoz.watch

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import android.os.SystemClock
import java.io.File

/** Graba el micrófono a un archivo .m4a (AAC). Es el formato que acepta Whisper. */
class VoiceRecorder(private val context: Context) {
    private var recorder: MediaRecorder? = null
    private var file: File? = null
    private var startedAt = 0L

    /** Empieza a grabar. Lanza una excepción si no se puede (sin permiso, micrófono ocupado…). */
    fun start() {
        val f = File(context.filesDir, "nota_${System.currentTimeMillis()}.m4a")
        val r = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            MediaRecorder(context)
        } else {
            @Suppress("DEPRECATION")
            MediaRecorder()
        }
        try {
            r.setAudioSource(MediaRecorder.AudioSource.MIC)
            r.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            r.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            r.setAudioSamplingRate(16_000) // suficiente para voz y archivos pequeños
            r.setAudioEncodingBitRate(32_000)
            r.setOutputFile(f.absolutePath)
            r.prepare()
            r.start()
        } catch (e: Exception) {
            r.release()
            f.delete()
            throw e
        }
        recorder = r
        file = f
        startedAt = SystemClock.elapsedRealtime()
    }

    fun elapsedSeconds(): Int = ((SystemClock.elapsedRealtime() - startedAt) / 1000).toInt()

    /** Volumen actual entre 0 y 1 (para animar el botón). */
    fun level(): Float = ((recorder?.maxAmplitude ?: 0) / 32767f).coerceIn(0f, 1f)

    /** Detiene la grabación. Devuelve (archivo, segundos) o null si falló. */
    fun stop(): Pair<File, Int>? {
        val r = recorder ?: return null
        val f = file
        val secs = elapsedSeconds()
        recorder = null
        file = null
        return try {
            r.stop()
            if (f != null) f to secs else null
        } catch (e: RuntimeException) { // stop() falla si se grabó casi nada
            f?.delete()
            null
        } finally {
            r.release()
        }
    }
}
