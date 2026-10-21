package com.diariovoz.watch

/** Modo demo: simula transcripción y análisis para probar la app SIN claves de API. */
object Demo {
    private val texts = listOf(
        "Hoy fue un día pesado en el trabajo. Mi jefe movió la fecha de entrega del proyecto y me siento muy estresado. Tengo que quedarme a terminar y casi no dormí anoche, estoy agotado.",
        "Salí a caminar con mi amiga después de clases y me reí muchísimo. Me siento feliz y muy agradecido de tener gente así cerca. Fue un día genial.",
        "Hablé con mi mamá por teléfono y la extraño bastante. Me quedé un rato triste, pero me hizo bien escucharla. Ojalá pueda visitarla pronto, a ella y a mi familia.",
        "Tengo examen mañana y estoy nervioso, no he estudiado lo suficiente. Voy a repasar toda la noche aunque tenga sueño. Espero que salga bien la escuela esta semana.",
        "Fue una tarde tranquila. Fui al gimnasio, cociné algo rico y me sentí en paz. Necesitaba un día de descanso así, sin prisa y sin pendientes.",
        "Estoy molesto por lo injusto que fue lo de hoy en la oficina. Me siento harto y frustrado, y encima tengo que pagar la renta esta semana y el dinero no alcanza.",
    )

    // Palabras clave SIN acentos: el texto se normaliza antes de comparar.
    private val emotionWords = listOf(
        Emotion.ANSIEDAD to listOf("estres", "nervios", "preocup", "ansios", "examen", "entrega"),
        Emotion.ENOJO to listOf("molest", "harto", "frustr", "injust", "enojo"),
        Emotion.TRISTEZA to listOf("triste", "extrano", "llor", "nostalg", "solo"),
        Emotion.CANSANCIO to listOf("agotad", "cansad", "sueno", "casi no dormi"),
        Emotion.GRATITUD to listOf("agradec", "gracias", "afortunad"),
        Emotion.ALEGRIA to listOf("feliz", "contento", "genial", "rei", "logre", "alegre"),
        Emotion.CALMA to listOf("tranquil", "paz", "relaj", "descanso", "calma"),
    )

    private val topicWords = listOf(
        "trabajo" to listOf("trabajo", "jefe", "oficina", "proyecto", "reunion"),
        "estudios" to listOf("escuela", "examen", "clases", "estudi", "tarea", "universidad"),
        "familia" to listOf("mama", "papa", "familia", "hermano", "abuel"),
        "amigos" to listOf("amigo", "amiga", "fiesta", "salimos"),
        "salud" to listOf("dormi", "dormir", "gimnasio", "ejercicio", "salud", "medico"),
        "dinero" to listOf("dinero", "pagar", "renta", "gasto", "ahorr"),
        "descanso" to listOf("descanso", "tranquil", "vacacion", "viaje"),
    )

    fun transcript(): String = texts.random()

    fun analyze(text: String): Analysis {
        val t = text.lowercase().stripAccents()

        var best = Emotion.OTRA
        var bestScore = 0
        for ((emotion, words) in emotionWords) {
            val score = words.count { t.contains(it) }
            if (score > bestScore) { // en empate gana la primera de la lista
                bestScore = score
                best = emotion
            }
        }

        val topics = topicWords
            .filter { (_, words) -> words.any { t.contains(it) } }
            .map { it.first }
            .take(3)

        val firstSentence = text.split(Regex("(?<=[.!?])\\s+")).first()
        val summary = if (firstSentence.length > 140) firstSentence.take(137) + "…" else firstSentence

        return buildAnalysis(summary, best.label, topics)
    }
}
