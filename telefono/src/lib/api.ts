// Llamadas a la IA. La app NUNCA lleva claves: habla con tu proxy (carpeta /proxy).
import { analizarDemo, transcribirDemo } from './demo';
import { Analisis, normalizarAnalisis } from './tipos';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN;

/** Si no configuraste EXPO_PUBLIC_API_URL, la app funciona con datos simulados. */
export const MODO_DEMO = !API_URL;

const TIMEOUT_MS = 90_000;

async function pedir(ruta: string, init: RequestInit): Promise<unknown> {
  const control = new AbortController();
  const timer = setTimeout(() => control.abort(), TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
    if (API_TOKEN) headers['x-app-token'] = API_TOKEN;
    const res = await fetch(`${API_URL}${ruta}`, { ...init, headers, signal: control.signal });
    const cuerpo: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof cuerpo === 'object' && cuerpo !== null && 'error' in cuerpo
          ? String((cuerpo as { error: unknown }).error)
          : `Error ${res.status}`;
      throw new Error(msg);
    }
    return cuerpo;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('El servidor tardó demasiado en responder.');
    }
    if (e instanceof TypeError) {
      throw new Error('No se pudo conectar. Revisa tu internet y la URL del proxy.');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export async function transcribir(audioUri: string): Promise<string> {
  if (MODO_DEMO) return transcribirDemo();

  const form = new FormData();
  // En React Native, un archivo se adjunta como { uri, name, type }.
  form.append('file', { uri: audioUri, name: 'nota.m4a', type: 'audio/m4a' } as unknown as Blob);

  const r = await pedir('/transcribe', { method: 'POST', body: form });
  const texto = typeof r === 'object' && r !== null && 'texto' in r ? (r as { texto: unknown }).texto : '';
  return typeof texto === 'string' ? texto.trim() : '';
}

export async function analizar(texto: string): Promise<Analisis> {
  if (MODO_DEMO) return analizarDemo(texto);

  const r = await pedir('/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texto }),
  });
  return normalizarAnalisis(r);
}

/** Una nota tal como la guarda el proxy (la sube el reloj). */
export type NotaReloj = {
  id: string;
  fecha: string;
  duracion: number;
  transcripcion: string;
  resumen: string;
  emocion: string;
  temas: string[];
};

/**
 * Descarga del proxy las notas que subió el reloj.
 * En modo demo devuelve null (no hay proxy con el que sincronizar). Lanza si la petición falla.
 */
export async function obtenerNotasReloj(): Promise<NotaReloj[] | null> {
  if (MODO_DEMO) return null;

  const r = await pedir('/notes', { method: 'GET' });
  const lista = typeof r === 'object' && r !== null && 'notas' in r ? (r as { notas: unknown }).notas : null;
  if (!Array.isArray(lista)) throw new Error('Respuesta inesperada del proxy.');

  const salida: NotaReloj[] = [];
  for (const n of lista) {
    if (typeof n !== 'object' || n === null) continue;
    const o = n as Record<string, unknown>;
    if (typeof o.id !== 'string' || typeof o.fecha !== 'string') continue;
    if (!Number.isSafeInteger(Number(o.id)) || Number(o.id) <= 0) continue;
    salida.push({
      id: o.id,
      fecha: o.fecha,
      duracion: typeof o.duracion === 'number' ? o.duracion : 0,
      transcripcion: typeof o.transcripcion === 'string' ? o.transcripcion : '',
      resumen: typeof o.resumen === 'string' ? o.resumen : '',
      emocion: typeof o.emocion === 'string' ? o.emocion : 'otra',
      temas: Array.isArray(o.temas) ? o.temas.filter((t): t is string => typeof t === 'string') : [],
    });
  }
  return salida;
}
