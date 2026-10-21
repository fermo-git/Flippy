package com.diariovoz.watch

import android.app.Application
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.io.File

enum class Phase { IDLE, RECORDING, PROCESSING }

/**
 * Cerebro de la app. Guarda el estado (lista de notas, si está grabando…) y la pantalla
 * solo lo "dibuja". Sobrevive a rotaciones y cambios de configuración.
 */
class DiaryViewModel(app: Application) : AndroidViewModel(app) {
    companion object {
        const val MAX_SECONDS = 120 // límite por nota (controla costos)
        const val MIN_SECONDS = 2
    }

    private val store = EntryStore(app)
    private val recorder = VoiceRecorder(app)
    private var timerJob: Job? = null

    // Cada `by mutableStateOf` es un valor que, al cambiar, redibuja las pantallas que lo leen.
    var entries by mutableStateOf(store.load()); private set
    var phase by mutableStateOf(Phase.IDLE); private set
    var seconds by mutableIntStateOf(0); private set
    var level by mutableFloatStateOf(0f); private set
    var openEntryId by mutableStateOf<Long?>(null); private set
    var busyId by mutableStateOf<Long?>(null); private set
    var notice by mutableStateOf<String?>(null); private set

    val demoMode: Boolean = Api.demoMode

    init {
        // Reenvía al proxy las notas listas (por si alguna no se pudo subir sin internet).
        // El proxy actualiza por id, así que repetir no duplica nada.
        if (!demoMode) {
            viewModelScope.launch { Api.syncNotes(entries.filter { it.status == Status.READY }) }
        }
    }

    fun startRecording() {
        if (phase != Phase.IDLE) return
        notice = null
        openEntryId = null
        try {
            recorder.start()
        } catch (e: Exception) {
            notice = "No se pudo grabar: ${e.message ?: "error desconocido"}"
            return
        }
        seconds = 0
        level = 0f
        phase = Phase.RECORDING
        timerJob = viewModelScope.launch {
            while (isActive) {
                delay(100)
                seconds = recorder.elapsedSeconds()
                level = recorder.level()
                if (seconds >= MAX_SECONDS) {
                    finishRecording()
                    break
                }
            }
        }
    }

    /** Termina la grabación, la guarda y la procesa (transcribir + analizar). */
    fun finishRecording() {
        if (phase != Phase.RECORDING) return
        timerJob?.cancel()
        val result = recorder.stop()
        level = 0f
        if (result == null || result.second < MIN_SECONDS) {
            result?.first?.delete()
            notice = "Nota muy corta. Habla al menos $MIN_SECONDS segundos."
            phase = Phase.IDLE
            return
        }
        val now = System.currentTimeMillis()
        val entry = Entry(id = now, createdAt = now, audioPath = result.first.absolutePath, durationSec = result.second)
        saveEntry(entry) // primero guardamos: si algo falla después, la grabación no se pierde
        phase = Phase.PROCESSING
        viewModelScope.launch {
            process(entry.id)
            phase = Phase.IDLE
            openEntryId = entry.id
        }
    }

    /** Descarta la grabación en curso (por ejemplo, si el usuario sale de la pantalla). */
    fun cancelRecording() {
        if (phase != Phase.RECORDING) return
        timerJob?.cancel()
        recorder.stop()?.first?.delete()
        level = 0f
        phase = Phase.IDLE
    }

    fun consumeOpen() {
        openEntryId = null
    }

    fun retry(id: Long) {
        if (busyId != null) return
        busyId = id
        viewModelScope.launch {
            process(id)
            busyId = null
        }
    }

    fun delete(id: Long) {
        entries.firstOrNull { it.id == id }?.let { File(it.audioPath).delete() }
        entries = entries.filter { it.id != id }
        store.save(entries)
        viewModelScope.launch { Api.deleteNote(id) }
    }

    /** Si ya había transcripción (reintento tras fallar el análisis), no la repite. Nunca lanza. */
    private suspend fun process(id: Long) {
        val entry = entries.firstOrNull { it.id == id } ?: return
        try {
            var transcript = entry.transcript
            if (transcript.isBlank()) {
                transcript = Api.transcribe(File(entry.audioPath))
                if (transcript.isBlank()) throw ApiException("No se detectó voz en la grabación.")
                saveEntry(entry.copy(transcript = transcript))
            }
            val a = Api.analyze(transcript)
            val current = entries.firstOrNull { it.id == id } ?: return
            val ready = current.copy(
                summary = a.summary,
                emotion = a.emotion,
                topics = a.topics,
                status = Status.READY,
                error = null,
            )
            saveEntry(ready)
            viewModelScope.launch { Api.syncNotes(listOf(ready)) } // sin esperar: no frena la pantalla
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            val current = entries.firstOrNull { it.id == id } ?: return
            saveEntry(current.copy(status = Status.ERROR, error = e.message ?: "Error desconocido"))
        }
    }

    private fun saveEntry(entry: Entry) {
        val list = entries.toMutableList()
        val i = list.indexOfFirst { it.id == entry.id }
        if (i >= 0) list[i] = entry else list.add(entry)
        entries = list.sortedByDescending { it.createdAt }
        store.save(entries)
    }

    override fun onCleared() {
        cancelRecording()
        super.onCleared()
    }
}
