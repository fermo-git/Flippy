// Tipos compartidos por toda la app.

export const EMOCIONES = [
  'alegría',
  'calma',
  'gratitud',
  'tristeza',
  'ansiedad',
  'enojo',
  'cansancio',
  'otra',
] as const;

export type Emocion = (typeof EMOCIONES)[number];

/** pendiente = grabada pero aún sin procesar · listo = con resumen · error = falló el procesamiento */
export type EstadoEntrada = 'pendiente' | 'listo' | 'error';

export type Entrada = {
  id: number;
  fecha: string; // ISO, ej. "2026-10-16T14:30:00.000Z"
  audioUri: string;
  duracion: number; // segundos
  transcripcion: string;
  resumen: string;
  emocion: Emocion;
  temas: string[];
  estado: EstadoEntrada;
  error: string | null;
};

/** Las notas que llegan del reloj no tienen audio en el teléfono: su audioUri queda vacío. */
export function esDelReloj(e: Pick<Entrada, 'audioUri'>): boolean {
  return e.audioUri === '';
}

/** Lo que devuelve la IA al analizar una transcripción. */
export type Analisis = {
  resumen: string;
  emocion: Emocion;
  temas: string[];
};

export function quitarAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizarEmocion(valor: unknown): Emocion {
  if (typeof valor !== 'string') return 'otra';
  const limpio = quitarAcentos(valor.trim().toLowerCase());
  const encontrada = EMOCIONES.find((e) => quitarAcentos(e) === limpio);
  return encontrada ?? 'otra';
}

/** Convierte cualquier respuesta (posiblemente mal formada) de la IA en un Analisis seguro. */
export function normalizarAnalisis(crudo: unknown): Analisis {
  const obj = (typeof crudo === 'object' && crudo !== null ? crudo : {}) as Record<string, unknown>;
  const resumen = typeof obj.resumen === 'string' ? obj.resumen.trim() : '';
  const temas = Array.isArray(obj.temas)
    ? obj.temas
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 4)
    : [];
  return {
    resumen: resumen || 'Sin resumen disponible.',
    emocion: normalizarEmocion(obj.emocion),
    temas,
  };
}
