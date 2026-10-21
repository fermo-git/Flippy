package com.diariovoz.watch

/**
 * Conexión con tu proxy de Cloudflare, que es quien guarda la clave de OpenAI.
 *
 * Si API_URL está vacío, la app funciona en MODO DEMO (datos simulados, sin internet).
 * Para usar IA real, pon la URL de tu Worker y el mismo APP_TOKEN que guardaste en el proxy.
 *
 * Importante: NUNCA pongas aquí tu clave de OpenAI (sk-...), solo la URL y el token del proxy.
 */
object Config {
    const val API_URL = "https://diario-voz-proxy.appreloj.workers.dev"
    const val API_TOKEN = "estrella-gris-orbita-9382-fliPPy" 
}
