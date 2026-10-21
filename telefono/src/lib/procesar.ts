// Flujo completo: audio → transcripción → análisis → guardado.
import { analizar, transcribir } from './api';
import { guardarAnalisis, guardarTranscripcion, marcarError } from './db';
import { Entrada } from './tipos';

/**
 * Procesa una entrada. Si ya tenía transcripción (reintento tras un fallo del análisis),
 * se salta ese paso para no gastar otra llamada.
 * Nunca lanza: si algo falla, deja la entrada en estado "error" para poder reintentar.
 */
export async function procesarEntrada(entrada: Pick<Entrada, 'id' | 'audioUri' | 'transcripcion'>) {
  try {
    let texto = entrada.transcripcion;
    if (!texto.trim()) {
      texto = await transcribir(entrada.audioUri);
      if (!texto.trim()) throw new Error('No se detectó voz en la grabación.');
      await guardarTranscripcion(entrada.id, texto);
    }
    const analisis = await analizar(texto);
    await guardarAnalisis(entrada.id, analisis);
    return true;
  } catch (e) {
    await marcarError(entrada.id, e instanceof Error ? e.message : 'Error desconocido');
    return false;
  }
}
