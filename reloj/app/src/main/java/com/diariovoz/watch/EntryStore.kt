package com.diariovoz.watch

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

/** Guarda las notas en un archivo JSON dentro del almacenamiento privado del reloj. */
class EntryStore(context: Context) {
    private val file = File(context.filesDir, "entries.json")

    fun load(): List<Entry> {
        if (!file.exists()) return emptyList()
        return try {
            val arr = JSONArray(file.readText())
            (0 until arr.length()).map { toEntry(arr.getJSONObject(it)) }.sortedByDescending { it.createdAt }
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun save(entries: List<Entry>) {
        val arr = JSONArray()
        entries.forEach { arr.put(toJson(it)) }
        // Escribimos a un archivo temporal y lo renombramos: así nunca queda a medias.
        val tmp = File(file.parentFile, "entries.json.tmp")
        tmp.writeText(arr.toString())
        tmp.renameTo(file)
    }

    private fun toJson(e: Entry) = JSONObject()
        .put("id", e.id)
        .put("createdAt", e.createdAt)
        .put("audioPath", e.audioPath)
        .put("durationSec", e.durationSec)
        .put("transcript", e.transcript)
        .put("summary", e.summary)
        .put("emotion", e.emotion.name)
        .put("topics", JSONArray(e.topics))
        .put("status", e.status.name)
        .put("error", e.error ?: JSONObject.NULL)

    private fun toEntry(o: JSONObject): Entry {
        val topicsArr = o.optJSONArray("topics")
        return Entry(
            id = o.getLong("id"),
            createdAt = o.getLong("createdAt"),
            audioPath = o.optString("audioPath"),
            durationSec = o.optInt("durationSec"),
            transcript = o.optString("transcript"),
            summary = o.optString("summary"),
            emotion = runCatching { Emotion.valueOf(o.optString("emotion")) }.getOrDefault(Emotion.OTRA),
            topics = topicsArr?.let { a -> (0 until a.length()).map { a.optString(it) } } ?: emptyList(),
            status = runCatching { Status.valueOf(o.optString("status")) }.getOrDefault(Status.PENDING),
            error = if (o.isNull("error")) null else o.optString("error"),
        )
    }
}
