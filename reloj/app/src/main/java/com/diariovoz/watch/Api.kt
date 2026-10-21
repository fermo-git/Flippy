package com.diariovoz.watch

import android.util.Log
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.DataOutputStream
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** Error con un mensaje listo para mostrar al usuario. */
class ApiException(message: String) : Exception(message)

object Api {
    val demoMode: Boolean get() = Config.API_URL.isBlank()

    /** Audio → texto. */
    suspend fun transcribe(audio: File): String = withContext(Dispatchers.IO) {
        if (demoMode) {
            delay(1200)
            return@withContext Demo.transcript()
        }
        val boundary = "----DiarioVoz${System.currentTimeMillis()}"
        val conn = open("/transcribe")
        conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
        conn.setChunkedStreamingMode(0)
        try {
            DataOutputStream(conn.outputStream).use { out ->
                out.writeBytes("--$boundary\r\n")
                out.writeBytes("Content-Disposition: form-data; name=\"file\"; filename=\"nota.m4a\"\r\n")
                out.writeBytes("Content-Type: audio/m4a\r\n\r\n")
                audio.inputStream().use { it.copyTo(out) }
                out.writeBytes("\r\n--$boundary--\r\n")
            }
            readJson(conn).optString("texto").trim()
        } catch (e: SocketTimeoutException) {
            throw ApiException("El servidor tardó demasiado en responder.")
        } catch (e: IOException) {
            throw networkError(e)
        } finally {
            conn.disconnect()
        }
    }

    /** Texto → resumen, emoción y temas. */
    suspend fun analyze(text: String): Analysis = withContext(Dispatchers.IO) {
        if (demoMode) {
            delay(900)
            return@withContext Demo.analyze(text)
        }
        val conn = open("/analyze")
        conn.setRequestProperty("Content-Type", "application/json")
        try {
            val body = JSONObject().put("texto", text).toString()
            conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
            val json = readJson(conn)
            val topics = json.optJSONArray("temas")?.let { arr ->
                (0 until arr.length()).map { arr.optString(it) }
            }
            buildAnalysis(json.optString("resumen"), json.optString("emocion"), topics)
        } catch (e: SocketTimeoutException) {
            throw ApiException("El servidor tardó demasiado en responder.")
        } catch (e: IOException) {
            throw networkError(e)
        } finally {
            conn.disconnect()
        }
    }

    /**
     * Sube notas al proxy para que la app del teléfono las vea. Es "lo mejor que se pueda":
     * si falla (sin internet), la nota sigue guardada en el reloj y se reenvía al abrir la app.
     * Nunca lanza una excepción.
     */
    suspend fun syncNotes(notes: List<Entry>) {
        if (demoMode || notes.isEmpty()) return
        withContext(Dispatchers.IO) {
            try {
                val iso = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
                    .apply { timeZone = TimeZone.getTimeZone("UTC") }
                val arr = JSONArray()
                notes.forEach { e ->
                    arr.put(
                        JSONObject()
                            .put("id", e.id.toString())
                            .put("fecha", iso.format(Date(e.createdAt)))
                            .put("duracion", e.durationSec)
                            .put("transcripcion", e.transcript)
                            .put("resumen", e.summary)
                            .put("emocion", e.emotion.label)
                            .put("temas", JSONArray(e.topics)),
                    )
                }
                postQuietly("/notes", JSONObject().put("notas", arr))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.w("DiarioApi", "No se pudo sincronizar: ${e.message}")
            }
        }
    }

    /** Quita una nota borrada del proxy. Nunca lanza una excepción. */
    suspend fun deleteNote(id: Long) {
        if (demoMode) return
        withContext(Dispatchers.IO) {
            try {
                postQuietly("/notes/delete", JSONObject().put("id", id.toString()))
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                Log.w("DiarioApi", "No se pudo borrar en el proxy: ${e.message}")
            }
        }
    }

    private fun postQuietly(path: String, body: JSONObject) {
        val conn = open(path)
        conn.setRequestProperty("Content-Type", "application/json")
        try {
            conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            if (code !in 200..299) Log.w("DiarioApi", "El proxy respondió $code en $path")
        } finally {
            conn.disconnect()
        }
    }

    /** Mensaje con la causa real (clase del error) para saber si falla DNS, SSL o la conexión. */
    private fun networkError(e: IOException): ApiException {
        Log.e("DiarioApi", "Fallo de red hacia ${Config.API_URL}", e)
        val causa = when (e) {
            is java.net.UnknownHostException -> "No encuentra el servidor (sin internet o URL incorrecta)."
            is javax.net.ssl.SSLException -> "Fallo de conexión segura (SSL). Revisa la fecha y hora del emulador."
            is java.net.ConnectException -> "Conexión rechazada o sin red."
            else -> e.javaClass.simpleName
        }
        return ApiException("No se pudo conectar: $causa")
    }

    private fun open(path: String): HttpURLConnection {
        val conn = URL(Config.API_URL.trimEnd('/') + path).openConnection() as HttpURLConnection
        conn.requestMethod = "POST"
        conn.doOutput = true
        conn.connectTimeout = 15_000
        conn.readTimeout = 90_000
        if (Config.API_TOKEN.isNotBlank()) conn.setRequestProperty("x-app-token", Config.API_TOKEN)
        return conn
    }

    private fun readJson(conn: HttpURLConnection): JSONObject {
        val code = conn.responseCode
        val stream = if (code in 200..299) conn.inputStream else conn.errorStream
        val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
        val json = try { JSONObject(text) } catch (e: Exception) { JSONObject() }
        if (code !in 200..299) {
            throw ApiException(json.optString("error").ifEmpty { "Error del servidor ($code)" })
        }
        return json
    }
}
